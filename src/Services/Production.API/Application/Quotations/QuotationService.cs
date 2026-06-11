using Microsoft.EntityFrameworkCore;
using PJT_ERP.EventBus.Messages.Events;
using PJT_ERP.Production.Api.Application.Production;
using PJT_ERP.Production.Api.Domain.Entities;
using PJT_ERP.Production.Api.Infrastructure.Persistence;
using PJT_ERP.Shared.Infrastructure.Messaging;

namespace PJT_ERP.Production.Api.Application.Quotations;

public sealed class QuotationService(ProductionContext db, IEventPublisher eventPublisher) : IQuotationService
{
    public async Task<IReadOnlyCollection<QuotationDto>> ListAsync(string? status, Guid? customerId, CancellationToken cancellationToken)
    {
        var query = IncludeQuotation(db.Quotations.AsNoTracking());

        if (!string.IsNullOrWhiteSpace(status))
        {
            query = query.Where(quotation => quotation.Status == status.Trim());
        }

        if (customerId.HasValue)
        {
            query = query.Where(quotation => quotation.CustomerId == customerId.Value);
        }

        var quotations = await query
            .OrderByDescending(quotation => quotation.CreatedAtUtc)
            .ToListAsync(cancellationToken);

        return quotations.Select(ToDto).ToArray();
    }

    public async Task<QuotationDto?> GetAsync(Guid quotationId, CancellationToken cancellationToken)
    {
        var quotation = await IncludeQuotation(db.Quotations.AsNoTracking())
            .FirstOrDefaultAsync(quotation => quotation.Id == quotationId, cancellationToken);

        return quotation is null ? null : ToDto(quotation);
    }

    public async Task<QuotationDto> CreateAsync(CreateQuotationRequest request, CancellationToken cancellationToken)
    {
        ValidateCreateRequest(request);

        var now = DateTime.UtcNow;
        var customer = await GetOrCreateCustomerReplicaAsync(request, now, cancellationToken)
            ?? throw new InvalidOperationException("Customer does not exist in production replica.");

        var quotation = new Quotation
        {
            QuotationNumber = GenerateNumber("QU"),
            CustomerId = customer.Id,
            CustomerCode = customer.Code,
            CustomerName = customer.Name,
            CustomerEmail = customer.Email,
            Deadline = request.Deadline,
            Notes = NormalizeOptional(request.Notes),
            Status = request.Items.Any(item => string.IsNullOrWhiteSpace(item.DesignLink) && (item.BomItems is null || item.BomItems.Count == 0))
                ? QuotationStatuses.PendingDesign
                : QuotationStatuses.WaitingPricing,
            CreatedAtUtc = now,
            UpdatedAtUtc = now,
            Items = request.Items.Select(item => new QuotationItem
            {
                ProductId = item.ProductId,
                ProductName = item.ProductName.Trim(),
                Description = NormalizeOptional(item.Description),
                Quantity = item.Quantity,
                Unit = item.Unit.Trim(),
                CustomerImageUrl = NormalizeOptional(item.CustomerImageUrl),
                DesignLink = NormalizeOptional(item.DesignLink),
                CreatedAtUtc = now,
                UpdatedAtUtc = now
            }).ToList()
        };

        quotation.BomItems = request.Items
            .SelectMany((item, index) => (item.BomItems ?? [])
                .Select(bom => ToBomEntity(bom, quotation.Items[index].Id)))
            .ToList();

        await db.Quotations.AddAsync(quotation, cancellationToken);
        await db.SaveChangesAsync(cancellationToken);

        return await GetAsync(quotation.Id, cancellationToken)
            ?? throw new InvalidOperationException("Quotation was not found after creation.");
    }

    private async Task<CustomerReplica?> GetOrCreateCustomerReplicaAsync(
        CreateQuotationRequest request,
        DateTime now,
        CancellationToken cancellationToken)
    {
        var customer = await db.CustomerReplicas.AsNoTracking()
            .FirstOrDefaultAsync(customer => customer.Id == request.CustomerId, cancellationToken);

        if (customer is not null)
        {
            return customer;
        }

        if (request.Customer is null)
        {
            return null;
        }

        customer = new CustomerReplica
        {
            Id = request.CustomerId,
            Code = Required(request.Customer.Code, "Customer code"),
            Name = Required(request.Customer.Name, "Customer name"),
            Email = NormalizeOptional(request.Customer.Email),
            IsActive = true,
            UpdatedAtUtc = now
        };

        await db.CustomerReplicas.AddAsync(customer, cancellationToken);
        return customer;
    }

    public async Task<QuotationDto?> AssignEngineerAsync(Guid quotationId, AssignQuotationEngineerRequest request, CancellationToken cancellationToken)
    {
        var quotation = await GetTrackedQuotationAsync(quotationId, cancellationToken);
        if (quotation is null)
        {
            return null;
        }

        if (quotation.Status is not (QuotationStatuses.PendingDesign or QuotationStatuses.DesignReview))
        {
            throw new InvalidOperationException("Only design-stage quotations can be assigned to engineering.");
        }

        quotation.AssignedEngineerId = request.EngineerId == Guid.Empty
            ? throw new InvalidOperationException("Engineer id is required.")
            : request.EngineerId;
        quotation.AssignedEngineerName = Required(request.EngineerName, "Engineer name");
        quotation.UpdatedAtUtc = DateTime.UtcNow;

        await db.SaveChangesAsync(cancellationToken);
        return ToDto(quotation);
    }

    public async Task<QuotationDto?> SubmitDesignAsync(Guid quotationId, SubmitQuotationDesignRequest request, CancellationToken cancellationToken)
    {
        var quotation = await GetTrackedQuotationAsync(quotationId, cancellationToken);
        if (quotation is null)
        {
            return null;
        }

        if (quotation.Status is not (QuotationStatuses.PendingDesign or QuotationStatuses.DesignReview))
        {
            throw new InvalidOperationException("Quotation is not waiting for design work.");
        }

        if (request.BomItems.Count == 0)
        {
            throw new InvalidOperationException("BOM must contain at least one material item.");
        }

        var designLink = Required(request.DesignLink, "Design link");
        var now = DateTime.UtcNow;
        quotation.DesignLink = designLink;
        quotation.AssignedEngineerId = request.EngineerId == Guid.Empty ? quotation.AssignedEngineerId : request.EngineerId;
        quotation.AssignedEngineerName = string.IsNullOrWhiteSpace(request.EngineerName) ? quotation.AssignedEngineerName : request.EngineerName.Trim();
        quotation.Status = QuotationStatuses.DesignReview;
        quotation.UpdatedAtUtc = now;

        foreach (var item in quotation.Items)
        {
            item.DesignLink = designLink;
            item.UpdatedAtUtc = now;
        }

        quotation.BomItems.Clear();
        quotation.BomItems.AddRange(request.BomItems.Select(item => ToBomEntity(item, null)));

        await db.SaveChangesAsync(cancellationToken);
        return ToDto(quotation);
    }

    public async Task<QuotationDto?> ApproveClientDesignAsync(Guid quotationId, CancellationToken cancellationToken)
    {
        var quotation = await GetTrackedQuotationAsync(quotationId, cancellationToken);
        if (quotation is null)
        {
            return null;
        }

        if (quotation.Status is not (QuotationStatuses.DesignReview or QuotationStatuses.ClientDesignApproval))
        {
            throw new InvalidOperationException("Quotation design is not ready for client approval.");
        }

        quotation.Status = QuotationStatuses.WaitingPricing;
        quotation.UpdatedAtUtc = DateTime.UtcNow;
        await db.SaveChangesAsync(cancellationToken);
        return ToDto(quotation);
    }

    public async Task<QuotationDto?> RequestDesignRevisionAsync(Guid quotationId, RequestQuotationRevisionRequest request, CancellationToken cancellationToken)
    {
        var quotation = await GetTrackedQuotationAsync(quotationId, cancellationToken);
        if (quotation is null)
        {
            return null;
        }

        quotation.Status = QuotationStatuses.PendingDesign;
        quotation.Notes = string.Join("\n", new[] { quotation.Notes, NormalizeOptional(request.Notes) }.Where(note => !string.IsNullOrWhiteSpace(note)));
        quotation.UpdatedAtUtc = DateTime.UtcNow;
        await db.SaveChangesAsync(cancellationToken);
        return ToDto(quotation);
    }

    public async Task<QuotationDto?> SubmitPricingAsync(Guid quotationId, SubmitQuotationPricingRequest request, CancellationToken cancellationToken)
    {
        var quotation = await GetTrackedQuotationAsync(quotationId, cancellationToken);
        if (quotation is null)
        {
            return null;
        }

        if (quotation.Status is not (QuotationStatuses.WaitingPricing or QuotationStatuses.ClientPriceApproval))
        {
            throw new InvalidOperationException("Quotation is not waiting for finance pricing.");
        }

        if (request.Amount <= 0)
        {
            throw new InvalidOperationException("Pricing amount must be greater than zero.");
        }

        var revision = quotation.PriceRevisions.Count == 0 ? 1 : quotation.PriceRevisions.Max(item => item.RevisionNumber) + 1;
        quotation.EstimatedAmount = decimal.Round(request.Amount, 2, MidpointRounding.AwayFromZero);
        quotation.Status = QuotationStatuses.ClientPriceApproval;
        quotation.UpdatedAtUtc = DateTime.UtcNow;
        var priceRevision = new QuotationPriceRevision
        {
            QuotationId = quotation.Id,
            RevisionNumber = revision,
            Amount = quotation.EstimatedAmount.Value,
            RevisionDate = DateOnly.FromDateTime(DateTime.UtcNow),
            Notes = NormalizeOptional(request.Notes),
            FinanceUserId = request.FinanceUserId == Guid.Empty ? throw new InvalidOperationException("Finance user id is required.") : request.FinanceUserId,
            FinanceUserName = Required(request.FinanceUserName, "Finance user name")
        };
        await db.QuotationPriceRevisions.AddAsync(priceRevision, cancellationToken);
        quotation.PriceRevisions.Add(priceRevision);

        await db.SaveChangesAsync(cancellationToken);
        return ToDto(quotation);
    }

    public async Task<QuotationDto?> MarkWonAsync(Guid quotationId, CancellationToken cancellationToken)
    {
        var quotation = await GetTrackedQuotationAsync(quotationId, cancellationToken);
        if (quotation is null)
        {
            return null;
        }

        if (quotation.Status != QuotationStatuses.ClientPriceApproval || quotation.EstimatedAmount is null)
        {
            throw new InvalidOperationException("Only priced quotations can be marked as won.");
        }

        quotation.Status = QuotationStatuses.Won;
        quotation.UpdatedAtUtc = DateTime.UtcNow;
        await db.SaveChangesAsync(cancellationToken);
        return ToDto(quotation);
    }

    public async Task<QuotationDto?> MarkLostAsync(Guid quotationId, MarkQuotationLostRequest request, CancellationToken cancellationToken)
    {
        var quotation = await GetTrackedQuotationAsync(quotationId, cancellationToken);
        if (quotation is null)
        {
            return null;
        }

        quotation.Status = QuotationStatuses.Lost;
        quotation.LostReason = Required(request.Reason, "Lost reason");
        quotation.UpdatedAtUtc = DateTime.UtcNow;
        await db.SaveChangesAsync(cancellationToken);
        return ToDto(quotation);
    }

    public async Task<SalesOrderDto?> ConvertToSalesOrderAsync(Guid quotationId, ConvertQuotationToSalesOrderRequest request, CancellationToken cancellationToken)
    {
        var quotation = await GetTrackedQuotationAsync(quotationId, cancellationToken);
        if (quotation is null)
        {
            return null;
        }

        if (quotation.Status != QuotationStatuses.Won)
        {
            throw new InvalidOperationException("Only won quotations can be converted to sales orders.");
        }

        if (quotation.ConvertedSalesOrderId.HasValue)
        {
            var existing = await db.SalesOrders
                .Include(order => order.Items)
                .FirstOrDefaultAsync(order => order.Id == quotation.ConvertedSalesOrderId.Value, cancellationToken);
            return existing is null ? null : ToSalesOrderDto(existing);
        }

        if (request.DpPercentage <= 0 || request.DpPercentage > 100)
        {
            throw new InvalidOperationException("DP percentage must be between 1 and 100.");
        }

        if (quotation.EstimatedAmount is null or <= 0)
        {
            throw new InvalidOperationException("Won quotation must have a valid pricing amount before conversion.");
        }

        var now = DateTime.UtcNow;
        var order = new SalesOrder
        {
            SoNumber = GenerateNumber("SO"),
            CustomerId = quotation.CustomerId,
            CustomerCode = quotation.CustomerCode,
            CustomerName = quotation.CustomerName,
            CustomerEmail = quotation.CustomerEmail,
            CustomerDrawingUrl = quotation.Items.Select(item => item.CustomerImageUrl).FirstOrDefault(value => !string.IsNullOrWhiteSpace(value)),
            DesignReference = quotation.DesignLink,
            DesignStatus = SalesOrderDesignStatuses.Approved,
            DesignApprovedAtUtc = now,
            SoDate = DateOnly.FromDateTime(now),
            TargetDate = quotation.Deadline,
            Status = SalesOrderStatuses.Draft,
            CreatedAtUtc = now,
            UpdatedAtUtc = now,
            Items = await BuildSalesOrderItemsAsync(quotation, cancellationToken)
        };

        await db.SalesOrders.AddAsync(order, cancellationToken);
        quotation.ConvertedSalesOrderId = order.Id;
        quotation.ConvertedSalesOrderNumber = order.SoNumber;
        quotation.UpdatedAtUtc = now;

        await eventPublisher.PublishAsync(
            new SalesOrderDpInvoiceRequestedEvent(
                order.Id,
                order.SoNumber,
                order.CustomerId,
                order.CustomerCode,
                order.CustomerName,
                order.CustomerEmail,
                order.TargetDate,
                quotation.EstimatedAmount.Value,
                request.DpPercentage,
                request.DueDate,
                order.Items
                    .Select(item => new SalesOrderDpInvoiceItem(
                        item.Id,
                        item.ProductId,
                        item.ProductPartNumber,
                        item.ProductDescription,
                        item.Qty))
                    .ToArray()),
            cancellationToken);
        await db.SaveChangesAsync(cancellationToken);

        return ToSalesOrderDto(order);
    }

    private async Task<List<SalesOrderItem>> BuildSalesOrderItemsAsync(Quotation quotation, CancellationToken cancellationToken)
    {
        var result = new List<SalesOrderItem>();
        foreach (var item in quotation.Items)
        {
            ProductReplica? product = null;
            if (item.ProductId.HasValue)
            {
                product = await db.ProductReplicas.AsNoTracking()
                    .FirstOrDefaultAsync(product => product.Id == item.ProductId.Value, cancellationToken);
            }

            result.Add(new SalesOrderItem
            {
                ProductId = item.ProductId ?? Guid.NewGuid(),
                ProductPartNumber = product?.PartNumber ?? item.ProductName,
                ProductDescription = product?.Description ?? item.Description ?? item.ProductName,
                ProductMaterialSpec = product?.MaterialSpec ?? BuildBomSummary(quotation),
                Qty = item.Quantity,
                Notes = item.Description
            });
        }

        return result;
    }

    private static string? BuildBomSummary(Quotation quotation)
    {
        if (quotation.BomItems.Count == 0)
        {
            return null;
        }

        return string.Join("; ", quotation.BomItems.Select(item => $"{item.Name} {item.Quantity:0.###} {item.Unit}"));
    }

    private static QuotationBomItem ToBomEntity(QuotationBomItemRequest request, Guid? quotationItemId)
    {
        if (request.Quantity <= 0)
        {
            throw new InvalidOperationException("BOM quantity must be greater than zero.");
        }

        return new QuotationBomItem
        {
            QuotationItemId = quotationItemId,
            ItemCode = NormalizeOptional(request.ItemCode),
            Name = Required(request.Name, "BOM item name"),
            Specification = NormalizeOptional(request.Specification),
            Quantity = request.Quantity,
            Unit = Required(request.Unit, "BOM item unit")
        };
    }

    private async Task<Quotation?> GetTrackedQuotationAsync(Guid quotationId, CancellationToken cancellationToken)
    {
        return await IncludeQuotation(db.Quotations)
            .FirstOrDefaultAsync(quotation => quotation.Id == quotationId, cancellationToken);
    }

    private static IQueryable<Quotation> IncludeQuotation(IQueryable<Quotation> query)
    {
        return query
            .Include(quotation => quotation.Items)
            .Include(quotation => quotation.BomItems)
            .Include(quotation => quotation.PriceRevisions);
    }

    private static void ValidateCreateRequest(CreateQuotationRequest request)
    {
        if (request.CustomerId == Guid.Empty)
        {
            throw new InvalidOperationException("Customer id is required.");
        }

        if (request.Items.Count == 0)
        {
            throw new InvalidOperationException("Quotation must contain at least one item.");
        }

        foreach (var item in request.Items)
        {
            Required(item.ProductName, "Product name");
            Required(item.Unit, "Unit");
            if (item.Quantity <= 0)
            {
                throw new InvalidOperationException("Quotation item quantity must be greater than zero.");
            }
        }
    }

    private static QuotationDto ToDto(Quotation quotation)
    {
        return new QuotationDto(
            quotation.Id,
            quotation.QuotationNumber,
            quotation.CustomerId,
            quotation.CustomerCode,
            quotation.CustomerName,
            quotation.CustomerEmail,
            quotation.Deadline,
            quotation.Status,
            quotation.AssignedEngineerId,
            quotation.AssignedEngineerName,
            quotation.DesignLink,
            quotation.EstimatedAmount,
            quotation.LostReason,
            quotation.ConvertedSalesOrderId,
            quotation.ConvertedSalesOrderNumber,
            quotation.CreatedAtUtc,
            quotation.UpdatedAtUtc,
            quotation.Items
                .OrderBy(item => item.CreatedAtUtc)
                .Select(item => new QuotationItemDto(
                    item.Id,
                    item.ProductId,
                    item.ProductName,
                    item.Description,
                    item.Quantity,
                    item.Unit,
                    item.CustomerImageUrl,
                    item.DesignLink))
                .ToArray(),
            quotation.BomItems
                .OrderBy(item => item.Name)
                .Select(item => new QuotationBomItemDto(
                    item.Id,
                    item.QuotationItemId,
                    item.ItemCode,
                    item.Name,
                    item.Specification,
                    item.Quantity,
                    item.Unit))
                .ToArray(),
            quotation.PriceRevisions
                .OrderBy(revision => revision.RevisionNumber)
                .Select(revision => new QuotationRevisionDto(
                    revision.RevisionNumber,
                    revision.Amount,
                    revision.RevisionDate,
                    revision.Notes))
                .ToArray());
    }

    private static SalesOrderDto ToSalesOrderDto(SalesOrder salesOrder)
    {
        return new SalesOrderDto(
            salesOrder.Id,
            salesOrder.SoNumber,
            salesOrder.CustomerId,
            salesOrder.CustomerCode,
            salesOrder.CustomerName,
            salesOrder.CustomerEmail,
            salesOrder.CustomerDrawingUrl,
            salesOrder.DesignReference,
            salesOrder.DesignStatus,
            salesOrder.DesignApprovedByUserId,
            salesOrder.DesignApprovedByName,
            salesOrder.DesignApprovedAtUtc,
            salesOrder.SoDate,
            salesOrder.TargetDate,
            salesOrder.ProductionWorkerUserId,
            salesOrder.ProductionWorkerName,
            salesOrder.QcReviewerUserId,
            salesOrder.QcReviewerName,
            salesOrder.Status,
            ProductionOrderStatuses.Waiting,
            null,
            null,
            null,
            null,
            salesOrder.CreatedAtUtc,
            salesOrder.UpdatedAtUtc,
            salesOrder.Items
                .OrderBy(item => item.ProductPartNumber)
                .Select(item => new SalesOrderItemDto(
                    item.Id,
                    item.ProductId,
                    item.ProductPartNumber,
                    item.ProductDescription,
                    item.Qty,
                    item.Notes))
                .ToArray());
    }

    private static string Required(string? value, string fieldName)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            throw new InvalidOperationException($"{fieldName} is required.");
        }

        return value.Trim();
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
