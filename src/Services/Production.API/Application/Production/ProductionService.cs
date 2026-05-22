using Microsoft.EntityFrameworkCore;
using PJT_ERP.EventBus.Messages.Events;
using PJT_ERP.Production.Api.Domain.Entities;
using PJT_ERP.Production.Api.Infrastructure.Persistence;
using PJT_ERP.Shared.Infrastructure.Messaging;

namespace PJT_ERP.Production.Api.Application.Production;

public sealed class ProductionService(ProductionContext db, IEventPublisher eventPublisher) : IProductionService
{
    public async Task<IReadOnlyCollection<SalesOrderDto>> ListSalesOrdersAsync(CancellationToken cancellationToken)
    {
        var orders = await db.SalesOrders
            .AsNoTracking()
            .Include(order => order.Items)
            .OrderByDescending(order => order.CreatedAtUtc)
            .ToListAsync(cancellationToken);

        return orders.Select(ToDto).ToArray();
    }

    public async Task<SalesOrderDto> CreateSalesOrderAsync(CreateSalesOrderRequest request, CancellationToken cancellationToken)
    {
        ValidateSalesOrderItems(request.Items);
        var productionWorker = NormalizeAssignment(request.ProductionWorker, "Production worker");
        var qcReviewer = NormalizeAssignment(request.QcReviewer, "QC reviewer");

        var customer = await db.CustomerReplicas
            .AsNoTracking()
            .FirstOrDefaultAsync(replica => replica.Id == request.CustomerId && replica.IsActive, cancellationToken)
            ?? throw new InvalidOperationException("Customer has not been replicated from MasterData yet.");

        var productIds = request.Items.Select(item => item.ProductId).Distinct().ToArray();
        var products = await db.ProductReplicas
            .AsNoTracking()
            .Where(replica => productIds.Contains(replica.Id) && replica.IsActive)
            .ToDictionaryAsync(replica => replica.Id, cancellationToken);

        if (products.Count != productIds.Length)
        {
            throw new InvalidOperationException("One or more products have not been replicated from MasterData yet.");
        }

        var order = new SalesOrder
        {
            SoNumber = GenerateNumber("SO"),
            CustomerId = customer.Id,
            CustomerCode = customer.Code,
            CustomerName = customer.Name,
            SoDate = request.SoDate,
            TargetDate = request.TargetDate,
            ProductionWorkerUserId = productionWorker?.UserId,
            ProductionWorkerName = productionWorker?.Name,
            QcReviewerUserId = qcReviewer?.UserId,
            QcReviewerName = qcReviewer?.Name,
            Items = request.Items.Select(item =>
            {
                var product = products[item.ProductId];
                return new SalesOrderItem
                {
                    ProductId = product.Id,
                    ProductPartNumber = product.PartNumber,
                    ProductDescription = product.Description,
                    ProductMaterialSpec = product.MaterialSpec,
                    Qty = item.Qty,
                    Notes = NormalizeOptional(item.Notes)
                };
            }).ToList()
        };

        await db.SalesOrders.AddAsync(order, cancellationToken);
        await db.SaveChangesAsync(cancellationToken);
        return ToDto(order);
    }

    public async Task<SalesOrderDto?> AssignSalesOrderEngineersAsync(
        Guid salesOrderId,
        AssignSalesOrderEngineersRequest request,
        CancellationToken cancellationToken)
    {
        var salesOrder = await db.SalesOrders
            .Include(order => order.Items)
            .FirstOrDefaultAsync(order => order.Id == salesOrderId, cancellationToken);

        if (salesOrder is null)
        {
            return null;
        }

        if (salesOrder.Status == SalesOrderStatuses.Cancelled)
        {
            throw new InvalidOperationException("Cancelled sales orders cannot be assigned.");
        }

        ApplyAssignment(salesOrder, request);
        salesOrder.UpdatedAtUtc = DateTime.UtcNow;
        await db.SaveChangesAsync(cancellationToken);
        return ToDto(salesOrder);
    }

    public async Task<SalesOrderProductionProgressDto> ConfirmSalesOrderAsync(Guid salesOrderId, ConfirmSalesOrderRequest request, CancellationToken cancellationToken)
    {
        var salesOrder = await IncludeProduction(db.SalesOrders)
            .FirstOrDefaultAsync(order => order.Id == salesOrderId, cancellationToken)
            ?? throw new InvalidOperationException("Sales order was not found.");

        if (salesOrder.Status == SalesOrderStatuses.Cancelled)
        {
            throw new InvalidOperationException("Cancelled sales orders cannot be confirmed.");
        }

        EnsureEngineersAssigned(salesOrder);
        ValidateSalesOrderItems(salesOrder.Items.Select(item => new CreateSalesOrderItemRequest(item.ProductId, item.Qty, item.Notes)).ToArray());

        var now = DateTime.UtcNow;
        salesOrder.Status = SalesOrderStatuses.InProduction;
        salesOrder.ApprovedByUserId = request.ApprovedByUserId;
        salesOrder.ApprovedAtUtc ??= now;
        salesOrder.UpdatedAtUtc = now;

        var productionOrder = GetPrimaryProductionOrder(salesOrder);
        if (productionOrder is null)
        {
            productionOrder = new ProductionOrder
            {
                SalesOrderId = salesOrder.Id,
                SalesOrder = salesOrder,
                SalesOrderItemId = salesOrder.Items.OrderBy(item => item.CreatedAtUtc).First().Id,
                PoNumber = salesOrder.SoNumber,
                DrawingRef = salesOrder.SoNumber,
                BarcodeUid = $"PJT|SO|{now:yyyyMMdd}|{salesOrder.Id:N}",
                OrderQty = salesOrder.Items.Sum(item => item.Qty)
            };

            await db.ProductionOrders.AddAsync(productionOrder, cancellationToken);
            salesOrder.ProductionOrders.Add(productionOrder);
        }

        await eventPublisher.PublishAsync(
            new SalesOrderConfirmedEvent(
                salesOrder.Id,
                salesOrder.SoNumber,
                salesOrder.CustomerId,
                now,
                BuildConfirmedItems(salesOrder),
                salesOrder.ProductionWorkerUserId,
                salesOrder.ProductionWorkerName,
                salesOrder.QcReviewerUserId,
                salesOrder.QcReviewerName),
            cancellationToken);

        await eventPublisher.PublishAsync(
            new SpkCreatedEvent(
                productionOrder.Id,
                salesOrder.Id,
                salesOrder.SoNumber,
                productionOrder.BarcodeUid,
                salesOrder.Items.OrderBy(item => item.CreatedAtUtc).First().ProductId,
                salesOrder.Items.OrderBy(item => item.CreatedAtUtc).First().Qty,
                salesOrder.Items.OrderBy(item => item.CreatedAtUtc).First().ProductPartNumber,
                salesOrder.Items.OrderBy(item => item.CreatedAtUtc).First().ProductDescription,
                salesOrder.SoNumber,
                salesOrder.Items.OrderBy(item => item.CreatedAtUtc).First().ProductMaterialSpec,
                salesOrder.SoNumber,
                salesOrder.ProductionWorkerUserId,
                salesOrder.ProductionWorkerName,
                salesOrder.QcReviewerUserId,
                salesOrder.QcReviewerName,
                BuildSpkItems(salesOrder)),
            cancellationToken);

        await db.SaveChangesAsync(cancellationToken);
        return await GetSalesOrderProgressAsync(salesOrder.Id, cancellationToken)
            ?? throw new InvalidOperationException("Sales order tracking was not found after confirmation.");
    }

    public async Task<SalesOrderProductionProgressDto?> GetSalesOrderProgressAsync(Guid salesOrderId, CancellationToken cancellationToken)
    {
        var salesOrder = await IncludeProduction(db.SalesOrders.AsNoTracking())
            .FirstOrDefaultAsync(order => order.Id == salesOrderId, cancellationToken);

        return salesOrder is null ? null : ToProgressDto(salesOrder);
    }

    public async Task<SalesOrderProductionProgressDto?> GetSalesOrderTrackingByCodeAsync(string trackingCode, CancellationToken cancellationToken)
    {
        var salesOrder = await FindSalesOrderByTrackingCodeAsync(trackingCode, asNoTracking: true, cancellationToken);
        return salesOrder is null ? null : ToProgressDto(salesOrder);
    }

    public async Task<PublicProductionTrackingDto?> GetPublicTrackingAsync(string trackingCode, CancellationToken cancellationToken)
    {
        var salesOrder = await FindSalesOrderByTrackingCodeAsync(trackingCode, asNoTracking: true, cancellationToken);
        return salesOrder is null ? null : ToPublicTrackingDto(salesOrder);
    }

    public async Task<SalesOrderProductionProgressDto?> UploadEngineeringDrawingAsync(
        Guid salesOrderId,
        UploadEngineeringDrawingRequest request,
        CancellationToken cancellationToken)
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
        EnsureAssignedWorker(productionOrder, request.UploadedByUserId);

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
        return await GetSalesOrderProgressAsync(salesOrder.Id, cancellationToken);
    }

    public async Task<SalesOrderProductionProgressDto?> StartProductionAsync(
        Guid salesOrderId,
        ProductionStatusUpdateRequest request,
        CancellationToken cancellationToken)
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
        EnsureAssignedWorker(productionOrder, request.WorkerUserId);
        StartProduction(productionOrder, request, DateTime.UtcNow);
        salesOrder.UpdatedAtUtc = productionOrder.UpdatedAtUtc;
        await db.SaveChangesAsync(cancellationToken);
        return await GetSalesOrderProgressAsync(salesOrder.Id, cancellationToken);
    }

    public async Task<SalesOrderProductionProgressDto?> FinishProductionAsync(
        Guid salesOrderId,
        ProductionStatusUpdateRequest request,
        CancellationToken cancellationToken)
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
        EnsureAssignedWorker(productionOrder, request.WorkerUserId);

        var wasAlreadyFinished = productionOrder.FinishedAtUtc.HasValue;
        FinishProduction(productionOrder, request, DateTime.UtcNow);
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
                    salesOrder.QcReviewerName),
                cancellationToken);
        }

        await db.SaveChangesAsync(cancellationToken);
        return await GetSalesOrderProgressAsync(salesOrder.Id, cancellationToken);
    }

    public async Task<ExecutiveDashboardDto> GetExecutiveDashboardAsync(CancellationToken cancellationToken)
    {
        var orders = await db.ProductionOrders.AsNoTracking().ToListAsync(cancellationToken);
        var approved = orders.Count(order => order.QcDecision == "Approved");
        var rejected = orders.Count(order => order.QcDecision == "Rejected");
        var reviewedOrders = approved + rejected;
        var rejectionRate = reviewedOrders == 0 ? 0 : decimal.Round((decimal)rejected / reviewedOrders * 100, 2);

        return new ExecutiveDashboardDto(
            orders.Count(order => order.Status == ProductionOrderStatuses.Waiting),
            orders.Count(order => order.Status == ProductionOrderStatuses.InProgress),
            orders.Count(order => order.Status == ProductionOrderStatuses.Finished),
            orders.Count(order => order.Status == ProductionOrderStatuses.Closed),
            approved,
            rejected,
            rejectionRate);
    }

    private async Task<SalesOrder?> FindSalesOrderByTrackingCodeAsync(
        string trackingCode,
        bool asNoTracking,
        CancellationToken cancellationToken)
    {
        var normalizedTrackingCode = trackingCode.Trim();
        if (string.IsNullOrWhiteSpace(normalizedTrackingCode))
        {
            throw new InvalidOperationException("Tracking code is required.");
        }

        var query = IncludeProduction(asNoTracking ? db.SalesOrders.AsNoTracking() : db.SalesOrders);
        return await query.FirstOrDefaultAsync(
            order =>
                order.SoNumber == normalizedTrackingCode
                || order.ProductionOrders.Any(productionOrder =>
                    productionOrder.BarcodeUid == normalizedTrackingCode
                    || productionOrder.PoNumber == normalizedTrackingCode),
            cancellationToken);
    }

    private static SalesOrderDto ToDto(SalesOrder order)
    {
        return new SalesOrderDto(
            order.Id,
            order.SoNumber,
            order.CustomerId,
            order.CustomerCode,
            order.CustomerName,
            order.SoDate,
            order.TargetDate,
            order.ProductionWorkerUserId,
            order.ProductionWorkerName,
            order.QcReviewerUserId,
            order.QcReviewerName,
            order.Status,
            order.CreatedAtUtc,
            order.UpdatedAtUtc,
            order.Items.OrderBy(item => item.ProductPartNumber).Select(ToDto).ToArray());
    }

    private static SalesOrderItemDto ToDto(SalesOrderItem item)
    {
        return new SalesOrderItemDto(
            item.Id,
            item.ProductId,
            item.ProductPartNumber,
            item.ProductDescription,
            item.Qty,
            item.Notes);
    }

    private static SalesOrderProductionProgressDto ToProgressDto(SalesOrder order)
    {
        var productionOrder = GetPrimaryProductionOrder(order);
        var updatedAtUtc = productionOrder is null || order.UpdatedAtUtc >= productionOrder.UpdatedAtUtc
            ? order.UpdatedAtUtc
            : productionOrder.UpdatedAtUtc;

        return new SalesOrderProductionProgressDto(
            order.Id,
            order.SoNumber,
            order.CustomerCode,
            order.CustomerName,
            order.ProductionWorkerUserId,
            order.ProductionWorkerName,
            order.QcReviewerUserId,
            order.QcReviewerName,
            order.Status,
            productionOrder?.Status ?? ProductionOrderStatuses.Waiting,
            order.Items.Count,
            order.Items.Sum(item => item.Qty),
            CalculateProgressPercent(productionOrder),
            productionOrder?.DrawingRef,
            productionOrder?.DrawingFileUrl,
            productionOrder?.DrawingUploadedByUserId,
            productionOrder?.DrawingUploaderName,
            productionOrder?.DrawingUploadedAtUtc,
            productionOrder?.BarcodeUid,
            productionOrder?.StartedAtUtc,
            productionOrder?.StartedByUserId,
            productionOrder?.StartedByName,
            productionOrder?.FinishedAtUtc,
            productionOrder?.FinishedByUserId,
            productionOrder?.FinishedByName,
            productionOrder is null ? null : CalculateDurationSeconds(productionOrder),
            productionOrder?.QcDecision,
            updatedAtUtc,
            order.Items
                .OrderBy(item => item.ProductPartNumber)
                .Select(item => new SalesOrderProductionProgressItemDto(
                    item.Id,
                    item.ProductId,
                    item.ProductPartNumber,
                    item.ProductDescription,
                    item.Qty))
                .ToArray());
    }

    private static PublicProductionTrackingDto ToPublicTrackingDto(SalesOrder order)
    {
        var productionOrder = GetPrimaryProductionOrder(order);
        var updatedAtUtc = productionOrder is null || order.UpdatedAtUtc >= productionOrder.UpdatedAtUtc
            ? order.UpdatedAtUtc
            : productionOrder.UpdatedAtUtc;

        return new PublicProductionTrackingDto(
            order.SoNumber,
            order.CustomerName,
            order.Status,
            productionOrder?.Status ?? ProductionOrderStatuses.Waiting,
            order.Items.Count,
            order.Items.Sum(item => item.Qty),
            CalculateProgressPercent(productionOrder),
            productionOrder?.StartedAtUtc,
            productionOrder?.FinishedAtUtc,
            productionOrder is null ? null : CalculateDurationSeconds(productionOrder),
            updatedAtUtc,
            order.Items
                .OrderBy(item => item.ProductPartNumber)
                .Select(item => new PublicProductionTrackingItemDto(
                    item.ProductPartNumber,
                    item.ProductDescription,
                    item.Qty))
                .ToArray());
    }

    private static decimal CalculateProgressPercent(ProductionOrder? order)
    {
        if (order is null)
        {
            return 0;
        }

        if (order.Status == ProductionOrderStatuses.Closed
            || order.Status == ProductionOrderStatuses.Finished
            || order.FinishedAtUtc.HasValue)
        {
            return 100;
        }

        return order.Status == ProductionOrderStatuses.InProgress ? 50 : 0;
    }

    private static long? CalculateDurationSeconds(ProductionOrder order)
    {
        if (!order.StartedAtUtc.HasValue)
        {
            return null;
        }

        var end = order.FinishedAtUtc ?? (order.Status == ProductionOrderStatuses.InProgress ? DateTime.UtcNow : null);
        if (!end.HasValue)
        {
            return null;
        }

        return Math.Max(0, (long)Math.Round((end.Value - order.StartedAtUtc.Value).TotalSeconds));
    }

    private static IQueryable<SalesOrder> IncludeProduction(IQueryable<SalesOrder> query)
    {
        return query
            .Include(order => order.Items)
            .Include(order => order.ProductionOrders);
    }

    private static ProductionOrder? GetPrimaryProductionOrder(SalesOrder salesOrder)
    {
        return salesOrder.ProductionOrders
            .OrderBy(order => order.CreatedAtUtc)
            .FirstOrDefault();
    }

    private static void ValidateSalesOrderItems(IReadOnlyCollection<CreateSalesOrderItemRequest> items)
    {
        if (items.Count == 0)
        {
            throw new InvalidOperationException("Sales order must contain at least one item.");
        }

        if (items.Any(item => item.Qty <= 0))
        {
            throw new InvalidOperationException("Sales order item quantity must be greater than zero.");
        }
    }

    private static EngineerAssignment? NormalizeAssignment(EngineerAssignment? assignment, string label)
    {
        if (assignment is null)
        {
            return null;
        }

        if (assignment.UserId == Guid.Empty)
        {
            throw new InvalidOperationException($"{label} user id is required.");
        }

        if (string.IsNullOrWhiteSpace(assignment.Name))
        {
            throw new InvalidOperationException($"{label} name is required.");
        }

        return assignment with { Name = assignment.Name.Trim() };
    }

    private static void ApplyAssignment(SalesOrder salesOrder, AssignSalesOrderEngineersRequest request)
    {
        var productionWorker = NormalizeAssignment(request.ProductionWorker, "Production worker");
        var qcReviewer = NormalizeAssignment(request.QcReviewer, "QC reviewer");

        if (productionWorker is not null)
        {
            salesOrder.ProductionWorkerUserId = productionWorker.UserId;
            salesOrder.ProductionWorkerName = productionWorker.Name;
        }

        if (qcReviewer is not null)
        {
            salesOrder.QcReviewerUserId = qcReviewer.UserId;
            salesOrder.QcReviewerName = qcReviewer.Name;
        }
    }

    private static void EnsureEngineersAssigned(SalesOrder salesOrder)
    {
        if (!salesOrder.ProductionWorkerUserId.HasValue || string.IsNullOrWhiteSpace(salesOrder.ProductionWorkerName))
        {
            throw new InvalidOperationException("A production worker engineer must be assigned before the sales order is confirmed.");
        }

        if (!salesOrder.QcReviewerUserId.HasValue || string.IsNullOrWhiteSpace(salesOrder.QcReviewerName))
        {
            throw new InvalidOperationException("A QC reviewer engineer must be assigned before the sales order is confirmed.");
        }
    }

    private static void ValidateWorkerRequest(ProductionStatusUpdateRequest request)
    {
        if (request.WorkerUserId == Guid.Empty)
        {
            throw new InvalidOperationException("Worker user id is required.");
        }

        if (string.IsNullOrWhiteSpace(request.WorkerName))
        {
            throw new InvalidOperationException("Worker name is required.");
        }
    }

    private static void ValidateDrawingUploadRequest(UploadEngineeringDrawingRequest request)
    {
        if (request.UploadedByUserId == Guid.Empty)
        {
            throw new InvalidOperationException("Uploader user id is required.");
        }

        if (string.IsNullOrWhiteSpace(request.UploaderName))
        {
            throw new InvalidOperationException("Uploader name is required.");
        }
    }

    private static void EnsureAssignedWorker(ProductionOrder productionOrder, Guid workerUserId)
    {
        var assignedWorkerId = productionOrder.SalesOrder?.ProductionWorkerUserId;
        if (!assignedWorkerId.HasValue)
        {
            throw new InvalidOperationException("This sales order does not have an assigned production worker.");
        }

        if (assignedWorkerId.Value != workerUserId)
        {
            throw new InvalidOperationException("Only the assigned production worker can update this sales order production.");
        }
    }

    private static void StartProduction(ProductionOrder productionOrder, ProductionStatusUpdateRequest request, DateTime timestampUtc)
    {
        if (productionOrder.Status == ProductionOrderStatuses.Closed)
        {
            throw new InvalidOperationException("Closed sales order production cannot be changed.");
        }

        if (productionOrder.Status == ProductionOrderStatuses.Finished)
        {
            throw new InvalidOperationException("Finished sales order production cannot be started again.");
        }

        productionOrder.Status = ProductionOrderStatuses.InProgress;
        productionOrder.StartedAtUtc ??= timestampUtc;
        productionOrder.StartedByUserId ??= request.WorkerUserId;
        productionOrder.StartedByName ??= request.WorkerName.Trim();
        productionOrder.UpdatedAtUtc = timestampUtc;
    }

    private static void FinishProduction(ProductionOrder productionOrder, ProductionStatusUpdateRequest request, DateTime timestampUtc)
    {
        if (productionOrder.Status == ProductionOrderStatuses.Closed)
        {
            throw new InvalidOperationException("Closed sales order production cannot be changed.");
        }

        if (!productionOrder.StartedAtUtc.HasValue || productionOrder.Status == ProductionOrderStatuses.Waiting)
        {
            throw new InvalidOperationException("Production must be started by the assigned worker before it can be finished.");
        }

        productionOrder.Status = ProductionOrderStatuses.Finished;
        productionOrder.FinishedAtUtc ??= timestampUtc;
        productionOrder.FinishedByUserId ??= request.WorkerUserId;
        productionOrder.FinishedByName ??= request.WorkerName.Trim();
        productionOrder.UpdatedAtUtc = timestampUtc;
    }

    private static SalesOrderConfirmedItem[] BuildConfirmedItems(SalesOrder salesOrder)
    {
        return salesOrder.Items
            .OrderBy(item => item.ProductPartNumber)
            .Select(item => new SalesOrderConfirmedItem(
                item.Id,
                item.ProductId,
                item.Qty,
                item.ProductPartNumber,
                item.ProductDescription,
                item.ProductMaterialSpec,
                item.Notes))
            .ToArray();
    }

    private static SpkCreatedItem[] BuildSpkItems(SalesOrder salesOrder)
    {
        return salesOrder.Items
            .OrderBy(item => item.ProductPartNumber)
            .Select(item => new SpkCreatedItem(
                item.Id,
                item.ProductId,
                item.Qty,
                item.ProductPartNumber,
                item.ProductDescription,
                item.ProductMaterialSpec,
                item.Notes))
            .ToArray();
    }

    private static string? NormalizeOptional(string? value)
    {
        return string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    }

    private static string GenerateNumber(string prefix)
    {
        return $"{prefix}-{DateTime.UtcNow:yyyyMMddHHmmss}-{Guid.NewGuid():N}"[..(prefix.Length + 24)].ToUpperInvariant();
    }
}
