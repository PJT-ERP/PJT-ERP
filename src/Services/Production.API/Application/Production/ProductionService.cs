using Microsoft.EntityFrameworkCore;
using PJT_HIMTIKA.EventBus.Messages.Events;
using PJT_HIMTIKA.Production.Api.Domain.Entities;
using PJT_HIMTIKA.Production.Api.Infrastructure.Persistence;
using PJT_HIMTIKA.Shared.Infrastructure.Messaging;

namespace PJT_HIMTIKA.Production.Api.Application.Production;

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
        if (request.Items.Count == 0)
        {
            throw new InvalidOperationException("Sales order must contain at least one item.");
        }

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
            Items = request.Items.Select(item =>
            {
                var product = products[item.ProductId];
                return new SalesOrderItem
                {
                    ProductId = product.Id,
                    ProductPartNumber = product.PartNumber,
                    ProductDescription = product.Description,
                    Qty = item.Qty,
                    Notes = item.Notes
                };
            }).ToList()
        };

        await db.SalesOrders.AddAsync(order, cancellationToken);
        await db.SaveChangesAsync(cancellationToken);
        return ToDto(order);
    }

    public async Task<IReadOnlyCollection<ProductionOrderDto>> ConfirmSalesOrderAsync(Guid salesOrderId, ConfirmSalesOrderRequest request, CancellationToken cancellationToken)
    {
        var salesOrder = await db.SalesOrders
            .Include(order => order.Items)
            .ThenInclude(item => item.ProductionOrders)
            .FirstOrDefaultAsync(order => order.Id == salesOrderId, cancellationToken)
            ?? throw new InvalidOperationException("Sales order was not found.");

        if (salesOrder.Status == SalesOrderStatuses.Cancelled)
        {
            throw new InvalidOperationException("Cancelled sales orders cannot be confirmed.");
        }

        salesOrder.Status = SalesOrderStatuses.InProduction;
        salesOrder.ApprovedByUserId = request.ApprovedByUserId;
        salesOrder.ApprovedAtUtc = DateTime.UtcNow;
        salesOrder.UpdatedAtUtc = DateTime.UtcNow;

        await eventPublisher.PublishAsync(
            new SalesOrderConfirmedEvent(salesOrder.Id, salesOrder.SoNumber, salesOrder.CustomerId, DateTime.UtcNow),
            cancellationToken);

        var createdOrders = new List<ProductionOrder>();
        foreach (var item in salesOrder.Items)
        {
            if (item.ProductionOrders.Count > 0)
            {
                continue;
            }

            var productionOrder = new ProductionOrder
            {
                SalesOrderItemId = item.Id,
                PoNumber = GenerateNumber("SPK"),
                DrawingRef = item.ProductPartNumber,
                BarcodeUid = $"PJT|SPK|{DateTime.UtcNow:yyyyMMdd}|{item.Id:N}",
                OrderQty = item.Qty
            };
            item.ProductionOrders.Add(productionOrder);
            createdOrders.Add(productionOrder);

            await eventPublisher.PublishAsync(
                new SpkCreatedEvent(
                    productionOrder.Id,
                    salesOrder.Id,
                    productionOrder.PoNumber,
                    productionOrder.BarcodeUid,
                    item.ProductId,
                    item.Qty),
                cancellationToken);
        }

        await db.SaveChangesAsync(cancellationToken);
        return createdOrders.Select(ToDto).ToArray();
    }

    public async Task<IReadOnlyCollection<ProductionOrderDto>> ListProductionOrdersAsync(CancellationToken cancellationToken)
    {
        var orders = await db.ProductionOrders
            .AsNoTracking()
            .OrderByDescending(order => order.CreatedAtUtc)
            .ToListAsync(cancellationToken);

        return orders.Select(ToDto).ToArray();
    }

    public async Task<ProductionOrderDto?> ScanAsync(ScanProductionOrderRequest request, CancellationToken cancellationToken)
    {
        var productionOrder = await db.ProductionOrders
            .FirstOrDefaultAsync(order => order.BarcodeUid == request.BarcodeUid, cancellationToken);

        if (productionOrder is null)
        {
            return null;
        }

        var action = request.Action.Trim();
        if (action.Equals("Start", StringComparison.OrdinalIgnoreCase))
        {
            productionOrder.Status = ProductionOrderStatuses.InProgress;
            productionOrder.StartedAtUtc ??= DateTime.UtcNow;
        }
        else if (action.Equals("Finish", StringComparison.OrdinalIgnoreCase))
        {
            productionOrder.Status = ProductionOrderStatuses.Finished;
            productionOrder.FinishedAtUtc = DateTime.UtcNow;
            await eventPublisher.PublishAsync(
                new ProductionFinishedEvent(productionOrder.Id, productionOrder.PoNumber, productionOrder.BarcodeUid, productionOrder.FinishedAtUtc.Value),
                cancellationToken);
        }
        else
        {
            throw new InvalidOperationException("Scan action must be Start or Finish.");
        }

        productionOrder.UpdatedAtUtc = DateTime.UtcNow;
        await db.SaveChangesAsync(cancellationToken);
        return ToDto(productionOrder);
    }

    public async Task<ExecutiveDashboardDto> GetExecutiveDashboardAsync(CancellationToken cancellationToken)
    {
        var orders = await db.ProductionOrders.AsNoTracking().ToListAsync(cancellationToken);
        var accepted = orders.Count(order => order.QcDecision == "Accept");
        var rejected = orders.Count(order => order.QcDecision == "Reject");
        var repair = orders.Count(order => order.QcDecision == "Repair");
        var scrap = orders.Count(order => order.QcDecision == "Scrap");
        var checkedOrders = accepted + rejected + repair + scrap;
        var defectRate = checkedOrders == 0 ? 0 : decimal.Round((decimal)(rejected + repair + scrap) / checkedOrders * 100, 2);

        return new ExecutiveDashboardDto(
            orders.Count(order => order.Status == ProductionOrderStatuses.Waiting),
            orders.Count(order => order.Status == ProductionOrderStatuses.InProgress),
            orders.Count(order => order.Status == ProductionOrderStatuses.Finished),
            orders.Count(order => order.Status == ProductionOrderStatuses.Closed),
            accepted,
            rejected,
            repair,
            scrap,
            defectRate);
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
            order.Status,
            order.CreatedAtUtc,
            order.UpdatedAtUtc,
            order.Items.Select(item => new SalesOrderItemDto(
                item.Id,
                item.ProductId,
                item.ProductPartNumber,
                item.ProductDescription,
                item.Qty,
                item.Notes)).ToArray());
    }

    private static ProductionOrderDto ToDto(ProductionOrder order)
    {
        return new ProductionOrderDto(
            order.Id,
            order.PoNumber,
            order.SalesOrderItemId,
            order.DrawingRef,
            order.BarcodeUid,
            order.OrderQty,
            order.Status,
            order.StartedAtUtc,
            order.FinishedAtUtc,
            order.QcDecision,
            order.UpdatedAtUtc);
    }

    private static string GenerateNumber(string prefix)
    {
        return $"{prefix}-{DateTime.UtcNow:yyyyMMddHHmmss}-{Guid.NewGuid():N}"[..(prefix.Length + 24)].ToUpperInvariant();
    }
}
