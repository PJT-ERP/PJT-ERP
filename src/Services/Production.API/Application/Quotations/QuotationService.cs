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
        var designSource = NormalizeDesignSource(request.DesignSource);
        var engineeringReviewRequired = designSource == QuotationDesignSources.Engineering || request.EngineeringReviewRequired;
        var customerDesignLink = request.Items.Select(item => NormalizeOptional(item.CustomerImageUrl))
            .FirstOrDefault(value => !string.IsNullOrWhiteSpace(value));
        if (designSource == QuotationDesignSources.CustomerProvided && string.IsNullOrWhiteSpace(customerDesignLink))
        {
            throw new InvalidOperationException("Customer-provided design link is required.");
        }
        if (designSource == QuotationDesignSources.CustomerProvided && !engineeringReviewRequired && !request.Items.Any(item => item.BomItems?.Count > 0))
        {
            throw new InvalidOperationException("At least one BOM item is required for costing and production.");
        }
        var customer = await GetOrCreateCustomerReplicaAsync(request, now, cancellationToken)
            ?? throw new InvalidOperationException("Customer does not exist in production replica.");

        var quotationNumber = await GenerateQuotationNumberAsync(cancellationToken);
        var quotation = new Quotation
        {
            QuotationNumber = quotationNumber,
            CustomerId = customer.Id,
            CustomerCode = customer.Code,
            CustomerName = customer.Name,
            CustomerEmail = customer.Email,
            Deadline = request.Deadline,
            Notes = NormalizeOptional(request.Notes),
            DesignSource = designSource,
            EngineeringReviewRequired = engineeringReviewRequired,
            EstimatedAmount = request.EstimatedAmount > 0 ? decimal.Round(request.EstimatedAmount.Value, 2, MidpointRounding.AwayFromZero) : null,
            Status = engineeringReviewRequired
                ? QuotationStatuses.PendingDesign
                : QuotationStatuses.ClientDesignApproval,
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

        var code = Required(request.Customer.Code, "Customer code");
        var name = Required(request.Customer.Name, "Customer name");
        var email = NormalizeOptional(request.Customer.Email);

        await db.Database.ExecuteSqlInterpolatedAsync($"""
            INSERT INTO customer_replicas ("Id", code, name, email, is_active, updated_at_utc)
            VALUES ({request.CustomerId}, {code}, {name}, {email}, true, {now})
            ON CONFLICT ("Id") DO UPDATE
            SET code = EXCLUDED.code,
                name = EXCLUDED.name,
                email = EXCLUDED.email,
                is_active = true,
                updated_at_utc = EXCLUDED.updated_at_utc;
            """, cancellationToken);

        return await db.CustomerReplicas.AsNoTracking()
            .FirstOrDefaultAsync(customer => customer.Id == request.CustomerId, cancellationToken);
    }

    public async Task<QuotationDto?> AssignEngineerAsync(Guid quotationId, AssignQuotationEngineerRequest request, CancellationToken cancellationToken)
    {
        var quotation = await GetTrackedQuotationAsync(quotationId, cancellationToken);
        if (quotation is null)
        {
            return null;
        }

        if (quotation.Status != QuotationStatuses.PendingDesign)
        {
            throw new InvalidOperationException("Only quotations awaiting Engineering work can be assigned or reassigned.");
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

        if (!quotation.AssignedEngineerId.HasValue)
        {
            throw new InvalidOperationException("Quotation must be assigned by Engineering Supervisor before design work can be submitted.");
        }

        if (request.EngineerId == Guid.Empty)
        {
            throw new InvalidOperationException("Engineer id is required.");
        }

        if (quotation.AssignedEngineerId.Value != request.EngineerId)
        {
            throw new InvalidOperationException("Only the assigned engineer can submit this quotation design.");
        }

        if (request.BomItems is null || request.BomItems.Count == 0)
        {
            throw new InvalidOperationException("BOM must contain at least one material item.");
        }

        var designLink = quotation.DesignSource == QuotationDesignSources.Engineering
            ? Required(request.DesignLink, "Design link")
            : NormalizeOptional(request.DesignLink);
        if (quotation.DesignSource == QuotationDesignSources.CustomerProvided && !HasCustomerDesign(quotation))
        {
            throw new InvalidOperationException("Customer-provided design link is required before engineering review.");
        }
        var now = DateTime.UtcNow;
        if (quotation.DesignSource == QuotationDesignSources.Engineering)
        {
            quotation.DesignLink = designLink;
            foreach (var item in quotation.Items)
            {
                item.DesignLink = designLink;
                item.UpdatedAtUtc = now;
            }
        }
        quotation.AssignedEngineerName = string.IsNullOrWhiteSpace(request.EngineerName) ? quotation.AssignedEngineerName : request.EngineerName.Trim();
        quotation.Status = QuotationStatuses.DesignReview;
        quotation.EngineeringApprovedAtUtc = null;
        quotation.ClientDesignApprovedAtUtc = null;
        quotation.UpdatedAtUtc = now;

        var replacementBomItems = request.BomItems
            .Select(item =>
            {
                var entity = ToBomEntity(item, null);
                entity.QuotationId = quotation.Id;
                return entity;
            })
            .ToArray();

        db.QuotationBomItems.RemoveRange(quotation.BomItems);
        await db.QuotationBomItems.AddRangeAsync(replacementBomItems, cancellationToken);

        await db.SaveChangesAsync(cancellationToken);
        return await GetAsync(quotation.Id, cancellationToken)
            ?? throw new InvalidOperationException("Quotation was not found after design submission.");
    }

    public async Task<QuotationDto?> ApproveDesignBySupervisorAsync(Guid quotationId, CancellationToken cancellationToken)
    {
        var quotation = await GetTrackedQuotationAsync(quotationId, cancellationToken);
        if (quotation is null)
        {
            return null;
        }

        if (quotation.Status != QuotationStatuses.DesignReview)
        {
            throw new InvalidOperationException("Only quotations in design review can be approved by Engineering Supervisor.");
        }

        if (quotation.DesignSource == QuotationDesignSources.Engineering && string.IsNullOrWhiteSpace(quotation.DesignLink))
        {
            throw new InvalidOperationException("Design link is required before supervisor approval.");
        }

        if (quotation.DesignSource == QuotationDesignSources.CustomerProvided && !HasCustomerDesign(quotation))
        {
            throw new InvalidOperationException("Customer-provided design link is required before supervisor approval.");
        }

        if (quotation.BomItems.Count == 0)
        {
            throw new InvalidOperationException("BOM is required before supervisor approval.");
        }

        quotation.Status = QuotationStatuses.ClientDesignApproval;
        quotation.EngineeringApprovedAtUtc = DateTime.UtcNow;
        quotation.UpdatedAtUtc = DateTime.UtcNow;
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

        if (quotation.Status != QuotationStatuses.ClientDesignApproval)
        {
            throw new InvalidOperationException("Quotation design is not ready for client approval.");
        }

        ValidateDesignCompletion(quotation);

        quotation.Status = QuotationStatuses.WaitingPricing;
        quotation.ClientDesignApprovedAtUtc = DateTime.UtcNow;
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

        if (quotation.ConvertedSalesOrderId.HasValue || quotation.Status is QuotationStatuses.Won or QuotationStatuses.Lost)
        {
            throw new InvalidOperationException("A won, lost, or converted quotation cannot be revised for design.");
        }

        if (quotation.DesignSource == QuotationDesignSources.CustomerProvided)
        {
            var revisedCustomerDesign = Required(request.CustomerDesignLink, "Revised customer design link");
            quotation.Items[0].CustomerImageUrl = revisedCustomerDesign;
            quotation.Items[0].UpdatedAtUtc = DateTime.UtcNow;
        }
        quotation.EngineeringApprovedAtUtc = null;
        quotation.ClientDesignApprovedAtUtc = null;
        quotation.EstimatedAmount = null;
        quotation.Status = quotation.EngineeringReviewRequired
            ? QuotationStatuses.PendingDesign
            : QuotationStatuses.ClientDesignApproval;
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

        ValidateDesignCompletion(quotation);
        if (quotation.ClientDesignApprovedAtUtc is null)
        {
            throw new InvalidOperationException("Customer design approval is required before pricing.");
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

        if (quotation.Status != QuotationStatuses.ClientPriceApproval || quotation.EstimatedAmount is null or <= 0 || quotation.PriceRevisions.Count == 0)
        {
            throw new InvalidOperationException("Only priced quotations can be marked as won.");
        }

        if (quotation.ClientDesignApprovedAtUtc is null)
        {
            throw new InvalidOperationException("Customer design approval is required before a quotation can be won.");
        }
        ValidateDesignCompletion(quotation);

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

        if (quotation.ConvertedSalesOrderId.HasValue || quotation.Status == QuotationStatuses.Won)
        {
            throw new InvalidOperationException("A won or converted quotation cannot be marked as lost.");
        }

        quotation.Status = QuotationStatuses.Lost;
        quotation.LostReason = Required(request.Reason, "Lost reason");
        quotation.UpdatedAtUtc = DateTime.UtcNow;
        await db.SaveChangesAsync(cancellationToken);
        return ToDto(quotation);
    }

    public Task<SalesOrderDto?> ConvertToSalesOrderAsync(Guid quotationId, CancellationToken cancellationToken)
    {
        var strategy = db.Database.CreateExecutionStrategy();
        return strategy.ExecuteAsync(async () =>
        {
            // A retry must reload state after the previous transaction rolled back.
            db.ChangeTracker.Clear();

            await using var transaction = db.Database.IsRelational()
                ? await db.Database.BeginTransactionAsync(System.Data.IsolationLevel.ReadCommitted, cancellationToken)
                : null;
            if (transaction is not null)
            {
                await db.Database.ExecuteSqlInterpolatedAsync($"SELECT \"Id\" FROM quotations WHERE \"Id\" = {quotationId} FOR UPDATE", cancellationToken);
            }
            var quotation = await GetTrackedQuotationAsync(quotationId, cancellationToken);
            if (quotation is null)
            {
                return null;
            }

            if (quotation.Status != QuotationStatuses.Won)
            {
                throw new InvalidOperationException("Only won quotations can be converted to sales orders.");
            }

            if (quotation.ConvertedSalesOrderId.HasValue || !string.IsNullOrWhiteSpace(quotation.ConvertedSalesOrderNumber))
            {
                throw new InvalidOperationException("This quotation has already been converted to a sales order.");
            }

            if (quotation.EstimatedAmount is null or <= 0 || quotation.PriceRevisions.Count == 0)
            {
                throw new InvalidOperationException("Won quotation must have a valid pricing amount before conversion.");
            }

            ValidateDesignCompletion(quotation);
            if (quotation.ClientDesignApprovedAtUtc is null)
            {
                throw new InvalidOperationException("Customer design approval is required before conversion.");
            }
            if (quotation.CustomerId == Guid.Empty || string.IsNullOrWhiteSpace(quotation.CustomerCode) || string.IsNullOrWhiteSpace(quotation.CustomerName))
            {
                throw new InvalidOperationException("Valid customer information is required before conversion.");
            }

            var now = DateTime.UtcNow;
            var soNumber = await GenerateSalesOrderNumberAsync(cancellationToken);
            var order = new SalesOrder
            {
                SoNumber = soNumber,
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
                Status = "WaitingPayment",
                EstimatedAmount = quotation.EstimatedAmount,
                IsCostingCompleted = true,
                CreatedAtUtc = now,
                UpdatedAtUtc = now,
                Items = await BuildSalesOrderItemsAsync(quotation, cancellationToken)
            };

            await db.SalesOrders.AddAsync(order, cancellationToken);
            quotation.ConvertedSalesOrderId = order.Id;
            quotation.ConvertedSalesOrderNumber = order.SoNumber;
            quotation.UpdatedAtUtc = now;

            await db.SaveChangesAsync(cancellationToken);

            await eventPublisher.PublishAsync(
                new SalesOrderReadyForInvoiceEvent(
                    order.Id,
                    order.SoNumber,
                    order.CustomerId,
                    order.CustomerCode,
                    order.CustomerName,
                    order.CustomerEmail,
                    order.TargetDate,
                    now,
                    order.Items
                        .Select(item => new SalesOrderReadyForInvoiceItem(
                            item.Id,
                            item.ProductId,
                            item.ProductPartNumber,
                            item.ProductDescription,
                            item.Qty,
                            item.UnitPrice))
                        .ToArray()),
                cancellationToken);
            await db.SaveChangesAsync(cancellationToken);
            if (transaction is not null)
            {
                await transaction.CommitAsync(cancellationToken);
            }

            return ToSalesOrderDto(order);
        });
    }

    private async Task<List<SalesOrderItem>> BuildSalesOrderItemsAsync(Quotation quotation, CancellationToken cancellationToken)
    {
        var result = new List<SalesOrderItem>();
        var totalQuantity = quotation.Items.Sum(item => item.Quantity);
        var unitPrice = totalQuantity > 0
            ? decimal.Round(quotation.EstimatedAmount.GetValueOrDefault() / totalQuantity, 2, MidpointRounding.AwayFromZero)
            : 0;
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
                UnitPrice = unitPrice,
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

    private static string NormalizeDesignSource(string? designSource)
    {
        return designSource?.Trim() switch
        {
            null or "" or QuotationDesignSources.Engineering => QuotationDesignSources.Engineering,
            QuotationDesignSources.CustomerProvided => QuotationDesignSources.CustomerProvided,
            _ => throw new InvalidOperationException("Design source must be Engineering or CustomerProvided.")
        };
    }

    public async Task<QuotationDto?> RequestPriceRevisionAsync(Guid quotationId, RequestQuotationRevisionRequest request, CancellationToken cancellationToken)
    {
        var quotation = await GetTrackedQuotationAsync(quotationId, cancellationToken);
        if (quotation is null)
        {
            return null;
        }
        if (quotation.Status != QuotationStatuses.ClientPriceApproval || quotation.ConvertedSalesOrderId.HasValue)
        {
            throw new InvalidOperationException("Only quotations awaiting customer price approval can be returned for repricing.");
        }

        quotation.Status = QuotationStatuses.WaitingPricing;
        quotation.EstimatedAmount = null;
        quotation.Notes = string.Join("\n", new[] { quotation.Notes, NormalizeOptional(request.Notes) }.Where(note => !string.IsNullOrWhiteSpace(note)));
        quotation.UpdatedAtUtc = DateTime.UtcNow;
        await db.SaveChangesAsync(cancellationToken);
        return ToDto(quotation);
    }

    private static bool HasCustomerDesign(Quotation quotation)
    {
        return quotation.Items.Any(item => !string.IsNullOrWhiteSpace(item.CustomerImageUrl));
    }

    private static void ValidateDesignCompletion(Quotation quotation)
    {
        if (quotation.DesignSource == QuotationDesignSources.Engineering)
        {
            if (string.IsNullOrWhiteSpace(quotation.DesignLink))
            {
                throw new InvalidOperationException("Engineering design link is required.");
            }
            if (quotation.BomItems.Count == 0)
            {
                throw new InvalidOperationException("BOM is required.");
            }
            if (quotation.EngineeringApprovedAtUtc is null)
            {
                throw new InvalidOperationException("SPV Engineering approval is required.");
            }
        }
        else
        {
            if (!HasCustomerDesign(quotation))
            {
                throw new InvalidOperationException("Customer-provided design link is required.");
            }
            if (quotation.BomItems.Count == 0)
            {
                throw new InvalidOperationException("BOM is required for costing and production.");
            }
            if (quotation.EngineeringReviewRequired && quotation.EngineeringApprovedAtUtc is null)
            {
                throw new InvalidOperationException("Engineering feasibility approval is required.");
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
            quotation.DesignSource,
            quotation.EngineeringReviewRequired,
            quotation.EngineeringApprovedAtUtc,
            quotation.ClientDesignApprovedAtUtc,
            quotation.AssignedEngineerId,
            quotation.AssignedEngineerName,
            quotation.DesignLink,
            quotation.EstimatedAmount,
            quotation.LostReason,
            quotation.Notes,
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
            salesOrder.RejectionReason,
            salesOrder.SoDate,
            salesOrder.TargetDate,
            salesOrder.DesignWorkerUserId,
            salesOrder.DesignWorkerName,
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
            null,
            salesOrder.CreatedAtUtc,
            salesOrder.UpdatedAtUtc,
            null,
            salesOrder.EstimatedAmount,
            salesOrder.IsCostingCompleted,
            salesOrder.DesignRevisions.OrderBy(r => r.Version).Select(r => new SalesOrderDesignRevisionDto(r.Version, r.Url, r.ChangedBy, r.ChangedAtUtc)).ToArray(),
            salesOrder.Items
                .OrderBy(item => item.ProductPartNumber)
                .Select(item => new SalesOrderItemDto(
                    item.Id,
                    item.ProductId,
                    item.ProductPartNumber,
                    item.ProductDescription,
                    item.Qty,
                    item.UnitPrice,
                    item.Notes))
                .ToArray(),
            DpPercentage: salesOrder.DpPercentage,
            DpDueDate: salesOrder.DpDueDate);
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

    private async Task<string> GenerateQuotationNumberAsync(CancellationToken cancellationToken)
    {
        var prefix = $"QU-{DateTime.UtcNow:yyyy}-";
        var existingNumbers = await db.Quotations
            .AsNoTracking()
            .Where(quotation => quotation.QuotationNumber.StartsWith(prefix))
            .Select(quotation => quotation.QuotationNumber)
            .ToListAsync(cancellationToken);

        return $"{prefix}{NextSequence(existingNumbers, prefix):000}";
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
