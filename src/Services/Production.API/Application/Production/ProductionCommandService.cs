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

        if (!Uri.TryCreate(request.DrawingFileUrl.Trim(), UriKind.Absolute, out var drawingUri)
            || drawingUri.Scheme is not ("http" or "https"))
        {
            throw new InvalidOperationException("Drawing file URL must be a valid HTTP or HTTPS link.");
        }

        productionOrder.DrawingFileUrl = drawingUri.ToString();
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

        var productionOrder = GetPrimaryProductionOrder(salesOrder)
            ?? throw new InvalidOperationException("Sales order must be confirmed before production can start.");

        ValidateWorkerRequest(request);
        EnsureAssignedWorker(productionOrder.SalesOrder?.ProductionWorkerUserId, request.WorkerUserId, isPrivileged, "production worker");
        
        var deductItems = salesOrder.Items
            .Select(soItem => new DeductBomStockRequestItem(soItem.ProductId, soItem.Qty))
            .ToList();
        
        if (deductItems.Count > 0)
        {
            await masterDataClient.DeductBomStockBulkAsync(deductItems, cancellationToken);
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
