using Microsoft.EntityFrameworkCore;
using PJT_ERP.EventBus.Messages.Events;
using PJT_ERP.Production.Api.Domain.Entities;
using PJT_ERP.Production.Api.Infrastructure.Persistence;
using PJT_ERP.Shared.Infrastructure.Messaging;

namespace PJT_ERP.Production.Api.Application.Production;

public class ProductionCommandService(
    ProductionContext db, 
    IEventPublisher eventPublisher,
    IMasterDataClient masterDataClient) : ProductionServiceBase(db, eventPublisher, masterDataClient), IProductionCommandService
{
    public async Task<SalesOrderProductionProgressDto?> UploadEngineeringDrawingAsync(
        Guid salesOrderId,
        UploadEngineeringDrawingRequest request,
        CancellationToken cancellationToken,
        bool isPrivileged = false)
    {
        var salesOrder = await IncludeProduction(db.SalesOrders)
            .FirstOrDefaultAsync(order => order.Id == salesOrderId, cancellationToken);

        if (salesOrder is null)
        {
            return null;
        }

        var productionOrder = GetPrimaryProductionOrder(salesOrder)
            ?? throw new InvalidOperationException("Sales order must be confirmed before engineering drawings can be uploaded.");

        ValidateDrawingUploadRequest(request);
        EnsureAssignedWorker(productionOrder.SalesOrder?.ProductionWorkerUserId, request.UploadedByUserId, isPrivileged, "production worker");

        if (!Uri.TryCreate(request.DrawingFileUrl.Trim(), UriKind.RelativeOrAbsolute, out var drawingUri) || 
            (!drawingUri.IsAbsoluteUri && !request.DrawingFileUrl.Trim().StartsWith('/')) ||
            (drawingUri.IsAbsoluteUri && drawingUri.Scheme is not ("http" or "https")))
        {
            throw new InvalidOperationException("Drawing file URL must be a valid HTTP/HTTPS link or a relative path starting with '/'.");
        }

        productionOrder.DrawingFileUrl = request.DrawingFileUrl.Trim();
        productionOrder.DrawingUploadedByUserId = request.UploadedByUserId;
        productionOrder.DrawingUploaderName = request.UploaderName.Trim();
        productionOrder.DrawingUploadedAtUtc = DateTime.UtcNow;
        productionOrder.DrawingRef = string.IsNullOrWhiteSpace(request.DrawingRef)
            ? productionOrder.DrawingRef
            : request.DrawingRef.Trim();
        productionOrder.UpdatedAtUtc = DateTime.UtcNow;
        salesOrder.UpdatedAtUtc = productionOrder.UpdatedAtUtc;

        await db.SaveChangesAsync(cancellationToken);
        return await GetSalesOrderProgressInternalAsync(salesOrder.Id, cancellationToken);
    }

    public async Task<SalesOrderProductionProgressDto?> SubmitMaterialRequestAsync(
        Guid salesOrderId,
        SubmitProductionMaterialRequest request,
        CancellationToken cancellationToken,
        bool isPrivileged = false)
    {
        var salesOrder = await IncludeProduction(db.SalesOrders)
            .FirstOrDefaultAsync(order => order.Id == salesOrderId, cancellationToken);

        if (salesOrder is null)
        {
            return null;
        }

        var productionOrder = GetPrimaryProductionOrder(salesOrder);

        ValidateMaterialRequest(request);
        EnsureAssignedWorker(productionOrder?.SalesOrder?.ProductionWorkerUserId, request.RequestedByUserId, isPrivileged, "production worker");

        if (productionOrder?.Status is ProductionOrderStatuses.Finished or ProductionOrderStatuses.Closed)
        {
            throw new InvalidOperationException("Finished or closed sales order production cannot receive material requests.");
        }

        var now = DateTime.UtcNow;
        await eventPublisher.PublishAsync(
            new MaterialRequestSubmittedEvent(
                salesOrder.Id,
                salesOrder.SoNumber,
                productionOrder?.Id ?? Guid.Empty,
                productionOrder?.BarcodeUid ?? $"PJT|SO|{now:yyyyMMdd}|{salesOrder.Id:N}",
                request.RequestedByUserId,
                request.RequesterName.Trim(),
                DateOnly.FromDateTime(now),
                salesOrder.SoNumber,
                NormalizeOptional(request.Notes),
                request.Items.Select(item => new MaterialRequestSubmittedItem(
                    item.MaterialRequirementId,
                    NormalizeSalesOrderItemId(item.SalesOrderItemId),
                    item.ItemName.Trim(),
                    NormalizeOptional(item.Size),
                    item.Qty,
                    NormalizeMaterialRequestUrgency(item.Urgency),
                    NormalizeOptional(item.SuggestedSupplier),
                    NormalizeOptional(item.Notes),
                    NormalizeMaterialRequestCategory(item.PurchaseCategory)))
                    .ToArray()),
            cancellationToken);

        if (productionOrder != null)
        {
            productionOrder.UpdatedAtUtc = now;
        }
        salesOrder.UpdatedAtUtc = now;
        await db.SaveChangesAsync(cancellationToken);
        return await GetSalesOrderProgressInternalAsync(salesOrder.Id, cancellationToken);
    }

    public async Task<SalesOrderProductionProgressDto?> StartProductionAsync(
        Guid salesOrderId,
        ProductionStatusUpdateRequest request,
        CancellationToken cancellationToken,
        bool isPrivileged = false)
    {
        var salesOrder = await IncludeProduction(db.SalesOrders)
            .FirstOrDefaultAsync(order => order.Id == salesOrderId, cancellationToken);

        if (salesOrder is null)
        {
            return null;
        }

        EnsureDesignApproved(salesOrder);

        var productionOrder = GetPrimaryProductionOrder(salesOrder);
        if (productionOrder is null)
        {
            var now = DateTime.UtcNow;
            var firstItem = salesOrder.Items.OrderBy(item => item.CreatedAtUtc).First();
            productionOrder = new ProductionOrder
            {
                SalesOrderId = salesOrder.Id,
                SalesOrder = salesOrder,
                SalesOrderItemId = firstItem.Id,
                PoNumber = salesOrder.SoNumber,
                DrawingRef = salesOrder.SoNumber,
                BarcodeUid = $"PJT|SO|{now:yyyyMMdd}|{salesOrder.Id:N}",
                OrderQty = salesOrder.Items.Sum(item => item.Qty)
            };

            await db.ProductionOrders.AddAsync(productionOrder, cancellationToken);
            salesOrder.ProductionOrders.Add(productionOrder);
        }

        ValidateWorkerRequest(request);
        EnsureAssignedWorker(productionOrder.SalesOrder?.ProductionWorkerUserId, request.WorkerUserId, isPrivileged, "production worker");

        var productIds = salesOrder.Items.Select(i => i.ProductId).Distinct().ToList();
        var boms = productIds.Count > 0 ? await masterDataClient.GetBomStockAsync(productIds, cancellationToken) : Array.Empty<BomStockDto>();
        var mappedMaterials = MapMaterials(salesOrder, boms);

        if (mappedMaterials != null && mappedMaterials.Count > 0)
        {
            var deductItems = mappedMaterials
                .Where(m => !m.IsCustomerMaterial && !string.IsNullOrEmpty(m.InventoryItemId) && Guid.TryParse(m.InventoryItemId, out _))
                .Select(m => new DeductCustomBomRequestItem(Guid.Parse(m.InventoryItemId!), m.Quantity))
                .ToList();

            if (deductItems.Count > 0)
            {
                await masterDataClient.DeductCustomBomAsync(deductItems, $"Produksi {salesOrder.SoNumber}", cancellationToken);
            }
        }

        StartProduction(productionOrder, request, DateTime.UtcNow);
        salesOrder.Status = SalesOrderStatuses.InProduction;
        salesOrder.UpdatedAtUtc = productionOrder.UpdatedAtUtc;
        await db.SaveChangesAsync(cancellationToken);
        return await GetSalesOrderProgressInternalAsync(salesOrder.Id, cancellationToken);
    }

    public async Task<SalesOrderProductionProgressDto?> FinishProductionAsync(
        Guid salesOrderId,
        ProductionStatusUpdateRequest request,
        CancellationToken cancellationToken,
        bool isPrivileged = false)
    {
        var salesOrder = await IncludeProduction(db.SalesOrders)
            .FirstOrDefaultAsync(order => order.Id == salesOrderId, cancellationToken);

        if (salesOrder is null)
        {
            return null;
        }

        var productionOrder = GetPrimaryProductionOrder(salesOrder)
            ?? throw new InvalidOperationException("Sales order must be confirmed before production can finish.");

        ValidateWorkerRequest(request);
        EnsureAssignedWorker(productionOrder.SalesOrder?.ProductionWorkerUserId, request.WorkerUserId, isPrivileged, "production worker");

        var wasAlreadyFinished = productionOrder.FinishedAtUtc.HasValue;
        FinishProduction(productionOrder, request, DateTime.UtcNow);
        salesOrder.Status = SalesOrderStatuses.QC;
        salesOrder.UpdatedAtUtc = productionOrder.UpdatedAtUtc;
        if (!wasAlreadyFinished)
        {
            await eventPublisher.PublishAsync(
                new ProductionFinishedEvent(
                    productionOrder.Id,
                    salesOrder.SoNumber,
                    productionOrder.BarcodeUid,
                    productionOrder.FinishedAtUtc!.Value,
                    salesOrder.Id,
                    salesOrder.SoNumber,
                    salesOrder.QcReviewerUserId,
                    salesOrder.QcReviewerName,
                    salesOrder.CustomerDrawingUrl,
                    salesOrder.DesignReference),
                cancellationToken);
        }

        await db.SaveChangesAsync(cancellationToken);
        return await GetSalesOrderProgressInternalAsync(salesOrder.Id, cancellationToken);
    }

    public async Task<SalesOrderProductionProgressDto?> PauseProductionAsync(
        Guid salesOrderId,
        ProductionStatusUpdateRequest request,
        CancellationToken cancellationToken,
        bool isPrivileged = false)
    {
        var salesOrder = await IncludeProduction(db.SalesOrders)
            .FirstOrDefaultAsync(order => order.Id == salesOrderId, cancellationToken);

        if (salesOrder is null) return null;

        var productionOrder = GetPrimaryProductionOrder(salesOrder)
            ?? throw new InvalidOperationException("Sales order must be confirmed before production can be paused.");

        ValidateWorkerRequest(request);
        EnsureAssignedWorker(productionOrder.SalesOrder?.ProductionWorkerUserId, request.WorkerUserId, isPrivileged, "production worker");

        PauseProduction(productionOrder, request, DateTime.UtcNow);
        salesOrder.UpdatedAtUtc = productionOrder.UpdatedAtUtc;
        
        await db.SaveChangesAsync(cancellationToken);
        return await GetSalesOrderProgressInternalAsync(salesOrder.Id, cancellationToken);
    }

    public async Task<SalesOrderProductionProgressDto?> ResumeProductionAsync(
        Guid salesOrderId,
        ProductionStatusUpdateRequest request,
        CancellationToken cancellationToken,
        bool isPrivileged = false)
    {
        var salesOrder = await IncludeProduction(db.SalesOrders)
            .FirstOrDefaultAsync(order => order.Id == salesOrderId, cancellationToken);

        if (salesOrder is null) return null;

        var productionOrder = GetPrimaryProductionOrder(salesOrder)
            ?? throw new InvalidOperationException("Sales order must be confirmed before production can be resumed.");

        EnsureAssignedWorker(productionOrder.SalesOrder?.ProductionWorkerUserId, request.WorkerUserId, isPrivileged, "production worker");

        ResumeProduction(productionOrder, request, DateTime.UtcNow);
        salesOrder.UpdatedAtUtc = productionOrder.UpdatedAtUtc;
        
        await db.SaveChangesAsync(cancellationToken);
        return await GetSalesOrderProgressInternalAsync(salesOrder.Id, cancellationToken);
    }
}
