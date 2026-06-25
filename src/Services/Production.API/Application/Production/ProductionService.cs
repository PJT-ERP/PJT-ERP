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
            .Include(order => order.ProductionOrders)
            .OrderByDescending(order => order.CreatedAtUtc)
            .ToListAsync(cancellationToken);

        return orders.Select(ToDto).ToArray();
    }

    public async Task<SalesOrderDto> CreateSalesOrderAsync(CreateSalesOrderRequest request, CancellationToken cancellationToken)
    {
        ValidateSalesOrderItems(request.Items);
        var designWorker = NormalizeAssignment(request.DesignWorker, "Design worker");
        var productionWorker = NormalizeAssignment(request.ProductionWorker, "Production worker");
        var qcReviewer = NormalizeAssignment(request.QcReviewer, "QC reviewer");

        CustomerReplica? customer = null;
        for (int i = 0; i < 5; i++)
        {
            customer = await db.CustomerReplicas
                .AsNoTracking()
                .FirstOrDefaultAsync(replica => replica.Id == request.CustomerId && replica.IsActive, cancellationToken);
            
            if (customer is not null) break;
            await Task.Delay(1500, cancellationToken);
        }

        if (customer is null)
        {
            throw new InvalidOperationException("Customer has not been replicated from MasterData yet.");
        }

        var productIds = request.Items.Select(item => item.ProductId).Distinct().ToArray();
        Dictionary<Guid, ProductReplica> products = new();
        for (int i = 0; i < 5; i++)
        {
            products = await db.ProductReplicas
                .AsNoTracking()
                .Where(replica => productIds.Contains(replica.Id) && replica.IsActive)
                .ToDictionaryAsync(replica => replica.Id, cancellationToken);
                
            if (products.Count == productIds.Length) break;
            await Task.Delay(1500, cancellationToken);
        }

        if (products.Count != productIds.Length)
        {
            throw new InvalidOperationException("One or more products have not been replicated from MasterData yet.");
        }

        var soNumber = await GenerateSalesOrderNumberAsync(cancellationToken);
        var order = new SalesOrder
        {
            SoNumber = soNumber,
            CustomerId = customer.Id,
            CustomerCode = customer.Code,
            CustomerName = customer.Name,
            CustomerEmail = customer.Email,
            CustomerDrawingUrl = NormalizeOptionalUrl(request.CustomerDrawingUrl, "Customer drawing URL"),
            DesignReference = NormalizeOptional(request.DesignReference),
            DesignStatus = NormalizeDesignStatus(request.DesignStatus),
            Status = NormalizeDesignStatus(request.DesignStatus) == "Approved" ? "Waiting Pricing" : SalesOrderStatuses.Draft,
            SoDate = request.SoDate,
            TargetDate = request.TargetDate,
            DesignWorkerUserId = designWorker?.UserId,
            DesignWorkerName = designWorker?.Name,
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

    public async Task<SalesOrderDto?> SubmitSalesOrderDesignAsync(
        Guid salesOrderId,
        SubmitSalesOrderDesignRequest request,
        CancellationToken cancellationToken)
    {
        var salesOrder = await db.SalesOrders
            .Include(order => order.Items)
            .FirstOrDefaultAsync(order => order.Id == salesOrderId, cancellationToken);

        if (salesOrder is null) return null;

        if (salesOrder.Status == SalesOrderStatuses.Cancelled)
        {
            throw new InvalidOperationException("Cancelled sales orders cannot submit design.");
        }

        salesOrder.DesignReference = request.DesignReference;
        
        salesOrder.DesignStatus = SalesOrderDesignStatuses.WaitingApproval;
        salesOrder.UpdatedAtUtc = DateTime.UtcNow;

        await db.SaveChangesAsync(cancellationToken);
        return ToDto(salesOrder);
    }

    public async Task<SalesOrderDto?> UpdateSalesOrderItemsAsync(
        Guid salesOrderId,
        UpdateSalesOrderItemsRequest request,
        CancellationToken cancellationToken)
    {
        var salesOrder = await db.SalesOrders
            .Include(order => order.Items)
            .FirstOrDefaultAsync(order => order.Id == salesOrderId, cancellationToken);

        if (salesOrder is null) return null;

        if (salesOrder.DesignStatus == SalesOrderDesignStatuses.Approved)
        {
            throw new InvalidOperationException("Cannot update items after design is approved.");
        }

        ValidateSalesOrderItems(request.Items);

        // For simplicity: remove existing, add new
        db.SalesOrderItems.RemoveRange(salesOrder.Items);
        
        var productIds = request.Items.Select(item => item.ProductId).Distinct().ToArray();
        Dictionary<Guid, ProductReplica> products = new();
        for (int i = 0; i < 5; i++)
        {
            products = await db.ProductReplicas
                .AsNoTracking()
                .Where(replica => productIds.Contains(replica.Id) && replica.IsActive)
                .ToDictionaryAsync(replica => replica.Id, cancellationToken);
                
            if (products.Count == productIds.Length) break;
            await Task.Delay(1500, cancellationToken);
        }

        if (products.Count != productIds.Length)
        {
            throw new InvalidOperationException("One or more products have not been replicated from MasterData yet.");
        }

        salesOrder.Items = request.Items.Select(item => new SalesOrderItem
        {
            SalesOrderId = salesOrder.Id,
            ProductId = item.ProductId,
            ProductPartNumber = products[item.ProductId].PartNumber,
            ProductDescription = products[item.ProductId].Description,
            Qty = item.Qty,
            Notes = item.Notes
        }).ToList();

        salesOrder.UpdatedAtUtc = DateTime.UtcNow;

        await db.SaveChangesAsync(cancellationToken);
        return ToDto(salesOrder);
    }

    public async Task<SalesOrderDto?> SetSalesOrderPricingAsync(
        Guid salesOrderId,
        SetSalesOrderPricingRequest request,
        CancellationToken cancellationToken)
    {
        var salesOrder = await db.SalesOrders
            .Include(order => order.Items)
            .FirstOrDefaultAsync(order => order.Id == salesOrderId, cancellationToken);

        if (salesOrder is null) return null;

        if (salesOrder.Status != "Waiting Pricing" && salesOrder.Status != "Waiting Payment")
        {
            throw new InvalidOperationException("Only sales orders waiting for pricing can be updated.");
        }

        foreach (var itemRequest in request.Items)
        {
            var item = salesOrder.Items.FirstOrDefault(i => i.Id == itemRequest.SalesOrderItemId);
            if (item != null)
            {
                item.UnitPrice = itemRequest.UnitPrice;
            }
        }

        salesOrder.Status = "Waiting Payment";
        salesOrder.UpdatedAtUtc = DateTime.UtcNow;

        var integrationEvent = new SalesOrderReadyForInvoiceEvent(
            salesOrder.Id,
            salesOrder.SoNumber,
            salesOrder.CustomerId,
            salesOrder.CustomerCode,
            salesOrder.CustomerName,
            salesOrder.CustomerEmail,
            salesOrder.TargetDate,
            DateTime.UtcNow,
            salesOrder.Items.Select(item => new SalesOrderReadyForInvoiceItem(
                item.Id,
                item.ProductId,
                item.ProductPartNumber,
                item.ProductDescription,
                item.Qty,
                item.UnitPrice
            )).ToList()
        );

        await eventPublisher.PublishAsync(integrationEvent, cancellationToken);

        await db.SaveChangesAsync(cancellationToken);
        return ToDto(salesOrder);
    }

    public async Task<SalesOrderDto?> UpdateSalesOrderDesignStatusAsync(
        Guid salesOrderId,
        UpdateSalesOrderDesignStatusRequest request,
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
            throw new InvalidOperationException("Cancelled sales orders cannot receive design updates.");
        }

        var designStatus = NormalizeDesignStatus(request.DesignStatus);
        if (designStatus == SalesOrderDesignStatuses.Approved)
        {
            if (!request.ReviewedByUserId.HasValue || request.ReviewedByUserId.Value == Guid.Empty)
            {
                throw new InvalidOperationException("Reviewer user id is required when approving a design.");
            }

            if (string.IsNullOrWhiteSpace(request.ReviewerName))
            {
                throw new InvalidOperationException("Reviewer name is required when approving a design.");
            }

            salesOrder.DesignApprovedByUserId = request.ReviewedByUserId;
            salesOrder.DesignApprovedByName = request.ReviewerName.Trim();
            salesOrder.DesignApprovedAtUtc = DateTime.UtcNow;
        }
        else
        {
            salesOrder.DesignApprovedByUserId = null;
            salesOrder.DesignApprovedByName = null;
            salesOrder.DesignApprovedAtUtc = null;
        }

        salesOrder.DesignStatus = designStatus;
        if (designStatus == SalesOrderDesignStatuses.Approved)
        {
            salesOrder.Status = "Waiting Pricing";
        }

        salesOrder.DesignReference = request.DesignReference is null
            ? salesOrder.DesignReference
            : NormalizeOptional(request.DesignReference);
        salesOrder.CustomerDrawingUrl = request.CustomerDrawingUrl is null
            ? salesOrder.CustomerDrawingUrl
            : NormalizeOptionalUrl(request.CustomerDrawingUrl, "Customer drawing URL");
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
        EnsureDesignApproved(salesOrder);
        ValidateSalesOrderItems(salesOrder.Items.Select(item => new CreateSalesOrderItemRequest(item.ProductId, item.Qty, item.Notes)).ToArray());

        var now = DateTime.UtcNow;
        salesOrder.Status = SalesOrderStatuses.InProduction;
        salesOrder.ApprovedByUserId = request.ApprovedByUserId;
        salesOrder.ApprovedAtUtc ??= now;
        salesOrder.UpdatedAtUtc = now;

        var firstItem = salesOrder.Items.OrderBy(item => item.CreatedAtUtc).First();
        var productionOrder = GetPrimaryProductionOrder(salesOrder);
        if (productionOrder is null)
        {
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
                firstItem.ProductId,
                firstItem.Qty,
                firstItem.ProductPartNumber,
                firstItem.ProductDescription,
                salesOrder.SoNumber,
                firstItem.ProductMaterialSpec,
                salesOrder.SoNumber,
                salesOrder.ProductionWorkerUserId,
                salesOrder.ProductionWorkerName,
                salesOrder.QcReviewerUserId,
                salesOrder.QcReviewerName,
                BuildSpkItems(salesOrder),
                salesOrder.CustomerDrawingUrl,
                salesOrder.DesignReference),
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

        var productionOrder = GetPrimaryProductionOrder(salesOrder)
            ?? throw new InvalidOperationException("Sales order must be confirmed before material requests can be submitted.");

        ValidateMaterialRequest(request);
        EnsureAssignedWorker(productionOrder, request.RequestedByUserId, isPrivileged);

        if (productionOrder.Status is ProductionOrderStatuses.Finished or ProductionOrderStatuses.Closed)
        {
            throw new InvalidOperationException("Finished or closed sales order production cannot receive material requests.");
        }

        var now = DateTime.UtcNow;
        await eventPublisher.PublishAsync(
            new MaterialRequestSubmittedEvent(
                salesOrder.Id,
                salesOrder.SoNumber,
                productionOrder.Id,
                productionOrder.BarcodeUid,
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

        productionOrder.UpdatedAtUtc = now;
        salesOrder.UpdatedAtUtc = now;
        await db.SaveChangesAsync(cancellationToken);
        return await GetSalesOrderProgressAsync(salesOrder.Id, cancellationToken);
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
        EnsureAssignedWorker(productionOrder, request.WorkerUserId, isPrivileged);
        StartProduction(productionOrder, request, DateTime.UtcNow);
        salesOrder.Status = SalesOrderStatuses.InProduction;
        salesOrder.UpdatedAtUtc = productionOrder.UpdatedAtUtc;
        await db.SaveChangesAsync(cancellationToken);
        return await GetSalesOrderProgressAsync(salesOrder.Id, cancellationToken);
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
        EnsureAssignedWorker(productionOrder, request.WorkerUserId, isPrivileged);

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
        return await GetSalesOrderProgressAsync(salesOrder.Id, cancellationToken);
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
        EnsureAssignedWorker(productionOrder, request.WorkerUserId, isPrivileged);

        PauseProduction(productionOrder, request, DateTime.UtcNow);
        salesOrder.UpdatedAtUtc = productionOrder.UpdatedAtUtc;
        
        await db.SaveChangesAsync(cancellationToken);
        return await GetSalesOrderProgressAsync(salesOrder.Id, cancellationToken);
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

        ValidateWorkerRequest(request);
        EnsureAssignedWorker(productionOrder, request.WorkerUserId, isPrivileged);

        ResumeProduction(productionOrder, request, DateTime.UtcNow);
        salesOrder.UpdatedAtUtc = productionOrder.UpdatedAtUtc;
        
        await db.SaveChangesAsync(cancellationToken);
        return await GetSalesOrderProgressAsync(salesOrder.Id, cancellationToken);
    }

    public async Task<ExecutiveDashboardDto> GetExecutiveDashboardAsync(CancellationToken cancellationToken)
    {
        var orders = await db.ProductionOrders.AsNoTracking().ToListAsync(cancellationToken);
        var goQc = orders.Count(order => IsQcGo(order.QcDecision));
        var noGoQc = orders.Count(order => IsQcNoGo(order.QcDecision));
        var reviewedOrders = goQc + noGoQc;
        var noGoRate = reviewedOrders == 0 ? 0 : decimal.Round((decimal)noGoQc / reviewedOrders * 100, 2);

        return new ExecutiveDashboardDto(
            orders.Count(order => order.Status == ProductionOrderStatuses.Waiting),
            orders.Count(order => order.Status == ProductionOrderStatuses.InProgress),
            orders.Count(order => order.Status == ProductionOrderStatuses.Finished),
            orders.Count(order => order.Status == ProductionOrderStatuses.Closed),
            goQc,
            noGoQc,
            noGoRate);
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
        var productionOrder = GetPrimaryProductionOrder(order);

        return new SalesOrderDto(
            order.Id,
            order.SoNumber,
            order.CustomerId,
            order.CustomerCode,
            order.CustomerName,
            order.CustomerEmail,
            order.CustomerDrawingUrl,
            order.DesignReference,
            order.DesignStatus,
            order.DesignApprovedByUserId,
            order.DesignApprovedByName,
            order.DesignApprovedAtUtc,
            order.SoDate,
            order.TargetDate,
            order.DesignWorkerUserId,
            order.DesignWorkerName,
            order.ProductionWorkerUserId,
            order.ProductionWorkerName,
            order.QcReviewerUserId,
            order.QcReviewerName,
            order.Status,
            productionOrder?.Status ?? ProductionOrderStatuses.Waiting,
            productionOrder?.StartedAtUtc,
            productionOrder?.FinishedAtUtc,
            productionOrder?.QcDecision,
            productionOrder?.DrawingFileUrl,
            productionOrder?.PauseReason,
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
            item.UnitPrice,
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
            order.CustomerEmail,
            order.CustomerDrawingUrl,
            order.DesignReference,
            order.DesignStatus,
            order.DesignApprovedByUserId,
            order.DesignApprovedByName,
            order.DesignApprovedAtUtc,
            order.DesignWorkerUserId,
            order.DesignWorkerName,
            order.ProductionWorkerUserId,
            order.ProductionWorkerName,
            order.QcReviewerUserId,
            order.QcReviewerName,
            order.Status,
            productionOrder?.Status ?? ProductionOrderStatuses.Waiting,
            order.Items.Count,
            order.Items.Sum(item => item.Qty),
            CalculateProgressPercent(order, productionOrder),
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
            productionOrder?.PauseReason,
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
            order.CustomerDrawingUrl,
            order.DesignReference,
            order.Status,
            productionOrder?.Status ?? ProductionOrderStatuses.Waiting,
            order.Items.Count,
            order.Items.Sum(item => item.Qty),
            CalculateProgressPercent(order, productionOrder),
            productionOrder?.DrawingFileUrl,
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

    private static decimal CalculateProgressPercent(SalesOrder order, ProductionOrder? prodOrder)
    {
        var soStatus = (order.Status ?? "").ToLowerInvariant();
        var prodStatus = (prodOrder?.Status ?? "").ToLowerInvariant();

        if (soStatus == "completed" || prodStatus == "closed") return 100;
        if (prodStatus == "finished") return 80;
        if (prodStatus == "inprogress" || prodStatus == "in_progress" || prodStatus == "paused" || soStatus == "inproduction" || soStatus == "in_production") return 60;
        if (soStatus == "ready for production" || soStatus == "waiting pricing" || soStatus == "menunggu invoice dp" || prodStatus == "waiting") return 40;
        if (soStatus == "confirmed") return 20;
        if (soStatus == "waiting spv approval") return 10;
        if (soStatus == "pending design" || soStatus == "revision required") return 5;

        return 0;
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

    private static bool IsQcGo(string? decision)
    {
        return decision is not null
            && (decision.Equals("Go", StringComparison.OrdinalIgnoreCase)
                || decision.Equals("Approved", StringComparison.OrdinalIgnoreCase)
                || decision.Equals("Approve", StringComparison.OrdinalIgnoreCase)
                || decision.Equals("Pass", StringComparison.OrdinalIgnoreCase));
    }

    private static bool IsQcNoGo(string? decision)
    {
        return decision is not null
            && (decision.Equals("NoGo", StringComparison.OrdinalIgnoreCase)
                || decision.Equals("No Go", StringComparison.OrdinalIgnoreCase)
                || decision.Equals("Rejected", StringComparison.OrdinalIgnoreCase)
                || decision.Equals("Reject", StringComparison.OrdinalIgnoreCase)
                || decision.Equals("Fail", StringComparison.OrdinalIgnoreCase));
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
        var designWorker = NormalizeAssignment(request.DesignWorker, "Design worker");
        var productionWorker = NormalizeAssignment(request.ProductionWorker, "Production worker");
        var qcReviewer = NormalizeAssignment(request.QcReviewer, "QC reviewer");

        if (designWorker is not null)
        {
            salesOrder.DesignWorkerUserId = designWorker.UserId;
            salesOrder.DesignWorkerName = designWorker.Name;
        }

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

    private static void EnsureDesignApproved(SalesOrder salesOrder)
    {
        if (salesOrder.DesignStatus != SalesOrderDesignStatuses.Approved)
        {
            throw new InvalidOperationException("Sales order design must be approved before the sales order is confirmed.");
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

    private static void ValidateMaterialRequest(SubmitProductionMaterialRequest request)
    {
        if (request.RequestedByUserId == Guid.Empty)
        {
            throw new InvalidOperationException("Requester user id is required.");
        }

        if (string.IsNullOrWhiteSpace(request.RequesterName))
        {
            throw new InvalidOperationException("Requester name is required.");
        }

        if (request.Items.Count == 0)
        {
            throw new InvalidOperationException("Material request must contain at least one item.");
        }

        if (request.Items.Any(item => string.IsNullOrWhiteSpace(item.ItemName)))
        {
            throw new InvalidOperationException("Material request item name is required.");
        }

        if (request.Items.Any(item => item.Qty <= 0))
        {
            throw new InvalidOperationException("Material request item quantity must be greater than zero.");
        }
    }

    private static void EnsureAssignedWorker(ProductionOrder productionOrder, Guid workerUserId, bool isPrivileged = false)
    {
        // Privileged users (Admin, Owner, Engineering Supervisor) can bypass worker assignment check
        if (isPrivileged)
        {
            return;
        }

        var assignedWorkerId = productionOrder.SalesOrder?.ProductionWorkerUserId;

        // If no worker is assigned yet, allow any engineering team member to submit
        if (!assignedWorkerId.HasValue)
        {
            return;
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

    private static void PauseProduction(ProductionOrder productionOrder, ProductionStatusUpdateRequest request, DateTime timestampUtc)
    {
        if (productionOrder.Status == ProductionOrderStatuses.Closed || productionOrder.Status == ProductionOrderStatuses.Finished)
        {
            throw new InvalidOperationException("Closed or finished sales order production cannot be paused.");
        }

        if (string.IsNullOrWhiteSpace(request.Reason))
        {
            throw new InvalidOperationException("Pause reason must be provided.");
        }

        productionOrder.Status = ProductionOrderStatuses.Paused;
        productionOrder.PauseReason = request.Reason.Trim();
        productionOrder.UpdatedAtUtc = timestampUtc;
    }

    private static void ResumeProduction(ProductionOrder productionOrder, ProductionStatusUpdateRequest request, DateTime timestampUtc)
    {
        if (productionOrder.Status != ProductionOrderStatuses.Paused)
        {
            throw new InvalidOperationException("Only paused production can be resumed.");
        }

        productionOrder.Status = ProductionOrderStatuses.InProgress;
        productionOrder.PauseReason = null;
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

    private static string? NormalizeOptionalUrl(string? value, string label)
    {
        var normalized = NormalizeOptional(value);
        if (normalized is null)
        {
            return null;
        }

        if (!Uri.TryCreate(normalized, UriKind.Absolute, out var uri)
            || uri.Scheme is not ("http" or "https"))
        {
            throw new InvalidOperationException($"{label} must be a valid HTTP or HTTPS link.");
        }

        return uri.ToString();
    }

    private static Guid? NormalizeSalesOrderItemId(Guid? salesOrderItemId)
    {
        return salesOrderItemId == Guid.Empty ? null : salesOrderItemId;
    }

    private static string NormalizeMaterialRequestUrgency(string? urgency)
    {
        if (string.IsNullOrWhiteSpace(urgency))
        {
            return "Normal";
        }

        return urgency.Trim() switch
        {
            var value when value.Equals("Normal", StringComparison.OrdinalIgnoreCase) => "Normal",
            var value when value.Equals("Urgent", StringComparison.OrdinalIgnoreCase) => "Urgent",
            var value when value.Equals("Critical", StringComparison.OrdinalIgnoreCase) => "Critical",
            _ => throw new InvalidOperationException("Material request urgency must be Normal, Urgent, or Critical.")
        };
    }

    private static string? NormalizeMaterialRequestCategory(string? category)
    {
        if (string.IsNullOrWhiteSpace(category))
        {
            return "Project";
        }

        return category.Trim() switch
        {
            var value when value.Equals("Asset", StringComparison.OrdinalIgnoreCase) => "Asset",
            var value when value.Equals("Consumable", StringComparison.OrdinalIgnoreCase) => "Consumable",
            var value when value.Equals("Tools", StringComparison.OrdinalIgnoreCase) => "Tools",
            var value when value.Equals("Project", StringComparison.OrdinalIgnoreCase) => "Project",
            var value when value.Equals("Maintenance", StringComparison.OrdinalIgnoreCase) => "Maintenance",
            _ => throw new InvalidOperationException("Material request purchase category must be Asset, Consumable, Tools, Project, or Maintenance.")
        };
    }

    private static string NormalizeDesignStatus(string? status)
    {
        if (string.IsNullOrWhiteSpace(status))
        {
            return SalesOrderDesignStatuses.PendingDesign;
        }

        return status.Trim() switch
        {
            var value when value.Equals(SalesOrderDesignStatuses.PendingDesign, StringComparison.OrdinalIgnoreCase) => SalesOrderDesignStatuses.PendingDesign,
            var value when value.Equals(SalesOrderDesignStatuses.WaitingApproval, StringComparison.OrdinalIgnoreCase) => SalesOrderDesignStatuses.WaitingApproval,
            var value when value.Equals(SalesOrderDesignStatuses.Approved, StringComparison.OrdinalIgnoreCase) => SalesOrderDesignStatuses.Approved,
            var value when value.Equals(SalesOrderDesignStatuses.RevisionRequired, StringComparison.OrdinalIgnoreCase) => SalesOrderDesignStatuses.RevisionRequired,
            var value when value.Equals(SalesOrderDesignStatuses.Rejected, StringComparison.OrdinalIgnoreCase) => SalesOrderDesignStatuses.Rejected,
            _ => throw new InvalidOperationException("Design status must be PendingDesign, WaitingApproval, Approved, RevisionRequired, or Rejected.")
        };
    }

    private async Task<string> GenerateSalesOrderNumberAsync(CancellationToken cancellationToken)
    {
        var prefix = $"SO-{DateTime.UtcNow:yyyy}-";
        var existingNumbers = await db.SalesOrders
            .AsNoTracking()
            .Where(order => order.SoNumber.StartsWith(prefix))
            .Select(order => order.SoNumber)
            .ToListAsync(cancellationToken);

        return $"{prefix}{NextSequence(existingNumbers, prefix):000}";
    }

    private static int NextSequence(IEnumerable<string> existingNumbers, string prefix)
    {
        var max = 0;
        foreach (var number in existingNumbers)
        {
            if (number.Length <= prefix.Length)
            {
                continue;
            }

            if (int.TryParse(number[prefix.Length..], out var value) && value > max)
            {
                max = value;
            }
        }

        return max + 1;
    }
}
