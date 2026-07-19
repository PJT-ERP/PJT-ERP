using Microsoft.EntityFrameworkCore;
using PJT_ERP.EventBus.Messages.Events;
using PJT_ERP.Production.Api.Domain.Entities;
using PJT_ERP.Production.Api.Infrastructure.Persistence;
using PJT_ERP.Shared.Infrastructure.Messaging;

namespace PJT_ERP.Production.Api.Application.Production;

public class SalesOrderCommandService(
    ProductionContext db, 
    IEventPublisher eventPublisher,
    IMasterDataClient masterDataClient) : ProductionServiceBase(db, eventPublisher, masterDataClient), ISalesOrderCommandService
{
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
        
        var isApproved = NormalizeDesignStatus(request.DesignStatus) == "Approved";
        var status = SalesOrderStatuses.Draft;
        if (isApproved)
        {
            status = "Waiting Pricing";
        }

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
            Status = status,
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

    public async Task<SalesOrderDto> CreateCompleteSalesOrderAsync(CompleteSalesOrderRequest request, CancellationToken cancellationToken)
    {
        var customerCode = request.Customer.Code.Trim().ToUpperInvariant();
        var existingCustomer = await db.CustomerReplicas.FirstOrDefaultAsync(c => c.Code.ToUpper() == customerCode, cancellationToken);
        Guid customerId;

        if (existingCustomer != null)
        {
            customerId = existingCustomer.Id;
        }
        else
        {
            var masterReq = new CreateCustomerMasterDataRequest(request.Customer.Code, request.Customer.Name, request.Customer.Address, request.Customer.ContactPerson, request.Customer.Email, request.Customer.Phone);
            var newCust = await masterDataClient.CreateCustomerAsync(masterReq, cancellationToken);
            customerId = newCust.Id;
        }

        var productMap = new Dictionary<string, Guid>();
        foreach (var prodReq in request.Products)
        {
            var masterProdReq = new CreateProductMasterDataRequest("", prodReq.Description, prodReq.Unit, prodReq.MaterialSpec);
            var newProd = await masterDataClient.CreateProductAsync(masterProdReq, cancellationToken);
            productMap[prodReq.TempId] = newProd.Id;
        }

        var createItems = new List<CreateSalesOrderItemRequest>();
        foreach (var item in request.Order.Items)
        {
            Guid productId = item.ExistingProductId ?? (item.ProductTempId != null && productMap.TryGetValue(item.ProductTempId, out var id) ? id : Guid.Empty);
            if (productId == Guid.Empty) throw new InvalidOperationException("Invalid product reference in order item.");

            createItems.Add(new CreateSalesOrderItemRequest(productId, item.Qty, item.UnitPrice, item.Notes, item.DesignReference, item.CustomerDrawingUrl));
        }

        var createRequest = new CreateSalesOrderRequest(
            customerId,
            request.Order.SoDate,
            request.Order.TargetDate,
            createItems,
            request.Order.DesignWorker,
            request.Order.ProductionWorker,
            request.Order.QcReviewer,
            request.Order.CustomerDrawingUrl,
            request.Order.DesignReference,
            request.Order.DesignStatus
        );

        return await CreateSalesOrderAsync(createRequest, cancellationToken);
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

        if (salesOrder is null) return null;

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

        if (salesOrder is null) return null;

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
        return await GetSalesOrderProgressInternalAsync(salesOrder.Id, cancellationToken)
            ?? throw new InvalidOperationException("Sales order tracking was not found after confirmation.");
    }
}
