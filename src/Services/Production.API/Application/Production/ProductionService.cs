using Microsoft.EntityFrameworkCore;
using PJT_ERP.EventBus.Messages.Events;
using PJT_ERP.Production.Api.Domain.Entities;
using PJT_ERP.Production.Api.Infrastructure.Persistence;
using PJT_ERP.Shared.Infrastructure.Messaging;

namespace PJT_ERP.Production.Api.Application.Production;

public sealed partial class ProductionService(
    ProductionContext db, 
    IEventPublisher eventPublisher,
    IMasterDataClient masterDataClient) : IProductionService
{
    public async Task<IReadOnlyCollection<SalesOrderDto>> ListSalesOrdersAsync(CancellationToken cancellationToken)
    {
        var orders = await db.SalesOrders
            .AsNoTracking()
            .Include(order => order.Items)
            .Include(order => order.ProductionOrders)
            .Include(order => order.DesignRevisions)
            .AsSplitQuery()
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

        var customer = await db.CustomerReplicas.FirstOrDefaultAsync(replica => replica.Id == request.CustomerId, cancellationToken);
        if (customer is null)
        {
            var masterCustomer = await masterDataClient.GetCustomerAsync(request.CustomerId, cancellationToken)
                ?? throw new InvalidOperationException("Customer was not found in MasterData API.");

            customer = new CustomerReplica
            {
                Id = masterCustomer.Id,
                Code = masterCustomer.Code,
                Name = masterCustomer.Name,
                Email = masterCustomer.Email,
                IsActive = masterCustomer.IsActive,
                UpdatedAtUtc = DateTime.UtcNow
            };
            await db.CustomerReplicas.AddAsync(customer, cancellationToken);
            await db.SaveChangesAsync(cancellationToken);
        }
        else if (!customer.IsActive)
        {
            throw new InvalidOperationException("Customer is not active.");
        }

        var productIds = request.Items.Select(item => item.ProductId).Distinct().ToArray();
        var products = await db.ProductReplicas
            .Where(replica => productIds.Contains(replica.Id))
            .ToDictionaryAsync(replica => replica.Id, cancellationToken);

        var missingProductIds = productIds.Except(products.Keys).ToArray();
        if (missingProductIds.Length > 0)
        {
            foreach (var missingId in missingProductIds)
            {
                var masterProduct = await masterDataClient.GetProductAsync(missingId, cancellationToken)
                    ?? throw new InvalidOperationException($"Product {missingId} was not found in MasterData API.");

                var product = new ProductReplica
                {
                    Id = masterProduct.Id,
                    PartNumber = masterProduct.PartNumber,
                    Description = masterProduct.Description,
                    Unit = masterProduct.Unit,
                    MaterialSpec = masterProduct.MaterialSpec,
                    IsActive = masterProduct.IsActive,
                    UpdatedAtUtc = DateTime.UtcNow
                };
                
                await db.ProductReplicas.AddAsync(product, cancellationToken);
                products[missingId] = product;
            }
            await db.SaveChangesAsync(cancellationToken);
        }

        foreach (var product in products.Values)
        {
            if (!product.IsActive) throw new InvalidOperationException($"Product {product.PartNumber} is not active.");
        }

        var soNumber = await GenerateSalesOrderNumberAsync(cancellationToken);
        var estimatedAmount = request.Items.Sum(item => item.Qty * item.UnitPrice);
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
            EstimatedAmount = estimatedAmount,
            DesignWorkerUserId = designWorker?.UserId,
            DesignWorkerName = designWorker?.Name,
            ProductionWorkerUserId = productionWorker?.UserId,
            ProductionWorkerName = productionWorker?.Name,
            QcReviewerUserId = qcReviewer?.UserId,
            QcReviewerName = qcReviewer?.Name,
            ProductionPhotos = new List<string>(),
            QcPhotos = new List<string>(),
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
                    UnitPrice = item.UnitPrice,
                    Notes = NormalizeOptional(item.Notes),
                    DesignReference = NormalizeOptional(item.DesignReference),
                    CustomerDrawingUrl = NormalizeOptionalUrl(item.CustomerDrawingUrl, "Customer drawing URL")
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
            .Include(order => order.DesignRevisions)
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
            .Include(order => order.DesignRevisions)
            .FirstOrDefaultAsync(order => order.Id == salesOrderId, cancellationToken);

        if (salesOrder is null) return null;

        if (salesOrder.Status == SalesOrderStatuses.Cancelled)
        {
            throw new InvalidOperationException("Cancelled sales orders cannot submit design.");
        }

        var newDesignRef = string.IsNullOrWhiteSpace(request.DesignReference) ? null : request.DesignReference.Trim();
        if (newDesignRef != salesOrder.DesignReference && !string.IsNullOrWhiteSpace(newDesignRef))
        {
            var rev = new SalesOrderDesignRevision
            {
                SalesOrderId = salesOrder.Id,
                Version = salesOrder.DesignRevisions.Count + 1,
                Url = newDesignRef,
                ChangedBy = string.IsNullOrWhiteSpace(request.UpdatedByName) ? "Engineering" : request.UpdatedByName.Trim(),
                ChangedAtUtc = DateTime.UtcNow
            };
            salesOrder.DesignRevisions.Add(rev);
            db.Entry(rev).State = EntityState.Added;
        }

        salesOrder.DesignReference = newDesignRef;
        
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
            .Include(order => order.DesignRevisions)
            .FirstOrDefaultAsync(order => order.Id == salesOrderId, cancellationToken);

        if (salesOrder is null) return null;

        if (salesOrder.DesignStatus == SalesOrderDesignStatuses.Approved && salesOrder.ProductionWorkerUserId != null)
        {
            throw new InvalidOperationException("Cannot update items after design is approved and assigned to production.");
        }

        ValidateSalesOrderItems(request.Items);

        // For simplicity: remove existing, add new
        db.SalesOrderItems.RemoveRange(salesOrder.Items);
        
        var productIds = request.Items.Select(item => item.ProductId).Distinct().ToArray();
        var products = await db.ProductReplicas
            .Where(replica => productIds.Contains(replica.Id))
            .ToDictionaryAsync(replica => replica.Id, cancellationToken);

        var missingProductIds = productIds.Except(products.Keys).ToArray();
        if (missingProductIds.Length > 0)
        {
            foreach (var missingId in missingProductIds)
            {
                var masterProduct = await masterDataClient.GetProductAsync(missingId, cancellationToken)
                    ?? throw new InvalidOperationException($"Product {missingId} was not found in MasterData API.");

                var product = new ProductReplica
                {
                    Id = masterProduct.Id,
                    PartNumber = masterProduct.PartNumber,
                    Description = masterProduct.Description,
                    Unit = masterProduct.Unit,
                    MaterialSpec = masterProduct.MaterialSpec,
                    IsActive = masterProduct.IsActive,
                    UpdatedAtUtc = DateTime.UtcNow
                };
                
                await db.ProductReplicas.AddAsync(product, cancellationToken);
                products[missingId] = product;
            }
            await db.SaveChangesAsync(cancellationToken);
        }

        foreach (var product in products.Values)
        {
            if (!product.IsActive) throw new InvalidOperationException($"Product {product.PartNumber} is not active.");
        }

        var newItems = request.Items.Select(item => {
            var existingItem = salesOrder.Items.FirstOrDefault(x => x.ProductId == item.ProductId);
            return new SalesOrderItem
            {
                Id = Guid.NewGuid(),
                SalesOrderId = salesOrder.Id,
                ProductId = item.ProductId,
                ProductPartNumber = products[item.ProductId].PartNumber,
                ProductDescription = products[item.ProductId].Description,
                Qty = item.Qty,
                UnitPrice = item.UnitPrice,
                Notes = item.Notes,
                CustomerDrawingUrl = existingItem?.CustomerDrawingUrl,
                DesignReference = existingItem?.DesignReference
            };
        }).ToList();

        db.SalesOrderItems.AddRange(newItems);

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
            .Include(order => order.DesignRevisions)
            .FirstOrDefaultAsync(order => order.Id == salesOrderId, cancellationToken);

        if (salesOrder is null) return null;

        var allowedStatuses = new[] { "Draft", "Waiting Pricing", "Waiting Payment", "Confirmed", "Ready for Production", "InProduction", "QC", "Completed" };
        if (!allowedStatuses.Contains(salesOrder.Status))
        {
            throw new InvalidOperationException($"Sales order status '{salesOrder.Status}' does not allow pricing updates.");
        }

        foreach (var itemRequest in request.Items)
        {
            var item = salesOrder.Items.FirstOrDefault(i => i.Id == itemRequest.SalesOrderItemId);
            if (item != null)
            {
                item.UnitPrice = itemRequest.UnitPrice;
            }
        }

        if (salesOrder.Status == "Waiting Pricing")
        {
            salesOrder.Status = "Waiting Payment";
        }
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

    public async Task<SalesOrderDto?> UpdateCustomerDrawingUrlAsync(
        Guid salesOrderId,
        UpdateCustomerDrawingUrlRequest request,
        CancellationToken cancellationToken)
    {
        var salesOrder = await db.SalesOrders
            .Include(order => order.Items)
            .Include(order => order.DesignRevisions)
            .FirstOrDefaultAsync(order => order.Id == salesOrderId, cancellationToken);

        if (salesOrder is null) return null;

        if (salesOrder.Status == SalesOrderStatuses.InProduction ||
            salesOrder.Status == SalesOrderStatuses.QC ||
            salesOrder.Status == SalesOrderStatuses.Completed ||
            salesOrder.Status == SalesOrderStatuses.Cancelled)
        {
            throw new InvalidOperationException($"Cannot update design because the order is already in '{salesOrder.Status}' status.");
        }

        var newDrawingUrl = NormalizeOptionalUrl(request.CustomerDrawingUrl, "Customer drawing URL");
        
        if (newDrawingUrl != salesOrder.CustomerDrawingUrl)
        {
            var rev = new SalesOrderDesignRevision
            {
                SalesOrderId = salesOrder.Id,
                Version = salesOrder.DesignRevisions.Count + 1,
                Url = newDrawingUrl ?? "",
                ChangedBy = string.IsNullOrWhiteSpace(request.UpdatedByName) ? "System" : request.UpdatedByName.Trim(),
                ChangedAtUtc = DateTime.UtcNow
            };
            salesOrder.DesignRevisions.Add(rev);
            db.Entry(rev).State = EntityState.Added;
            
            salesOrder.CustomerDrawingUrl = newDrawingUrl;
            salesOrder.UpdatedAtUtc = DateTime.UtcNow;
            await db.SaveChangesAsync(cancellationToken);
        }

        return ToDto(salesOrder);
    }

    public async Task<SalesOrderDto?> UpdateSalesOrderDesignStatusAsync(
        Guid salesOrderId,
        UpdateSalesOrderDesignStatusRequest request,
        CancellationToken cancellationToken)
    {
        var salesOrder = await db.SalesOrders
            .Include(order => order.Items)
            .Include(order => order.DesignRevisions)
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
            salesOrder.RejectionReason = null;
        }
        else if (designStatus == SalesOrderDesignStatuses.RevisionRequired || designStatus == SalesOrderDesignStatuses.Rejected)
        {
            salesOrder.RejectionReason = request.Notes;
        }

        var newDesignRef = request.DesignReference is null
            ? salesOrder.DesignReference
            : NormalizeOptional(request.DesignReference);

        if (newDesignRef != salesOrder.DesignReference && !string.IsNullOrWhiteSpace(newDesignRef))
        {
            var rev1 = new SalesOrderDesignRevision
            {
                SalesOrderId = salesOrder.Id,
                Version = salesOrder.DesignRevisions.Count + 1,
                Url = newDesignRef,
                ChangedBy = request.ReviewerName?.Trim() ?? "Engineering",
                ChangedAtUtc = DateTime.UtcNow
            };
            salesOrder.DesignRevisions.Add(rev1);
            db.Entry(rev1).State = EntityState.Added;
        }
        
        salesOrder.DesignReference = newDesignRef;

        var newDrawingUrl = request.CustomerDrawingUrl is null
            ? salesOrder.CustomerDrawingUrl
            : NormalizeOptionalUrl(request.CustomerDrawingUrl, "Customer drawing URL");

        if (newDrawingUrl != salesOrder.CustomerDrawingUrl && !string.IsNullOrWhiteSpace(newDrawingUrl))
        {
            var rev2 = new SalesOrderDesignRevision
            {
                SalesOrderId = salesOrder.Id,
                Version = salesOrder.DesignRevisions.Count + 1,
                Url = newDrawingUrl,
                ChangedBy = request.ReviewerName?.Trim() ?? "Sales",
                ChangedAtUtc = DateTime.UtcNow
            };
            salesOrder.DesignRevisions.Add(rev2);
            db.Entry(rev2).State = EntityState.Added;
        }
        
        salesOrder.CustomerDrawingUrl = newDrawingUrl;
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
        ValidateSalesOrderItems(salesOrder.Items.Select(item => new CreateSalesOrderItemRequest(item.ProductId, item.Qty, item.UnitPrice, item.Notes)).ToArray());

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

        var productionOrder = GetPrimaryProductionOrder(salesOrder);
        // Do not throw if productionOrder is null. MR can be submitted before SO is confirmed.

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
        EnsureAssignedWorker(productionOrder.SalesOrder?.ProductionWorkerUserId, request.WorkerUserId, isPrivileged, "production worker");
        
        // Deduct BOM stock atomically for all SO items using bulk API
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
        EnsureAssignedWorker(productionOrder.SalesOrder?.ProductionWorkerUserId, request.WorkerUserId, isPrivileged, "production worker");

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

        EnsureAssignedWorker(productionOrder.SalesOrder?.ProductionWorkerUserId, request.WorkerUserId, isPrivileged, "production worker");

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
