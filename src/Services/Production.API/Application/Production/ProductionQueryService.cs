using Microsoft.EntityFrameworkCore;
using PJT_ERP.EventBus.Messages.Events;
using PJT_ERP.Production.Api.Domain.Entities;
using PJT_ERP.Production.Api.Infrastructure.Persistence;
using PJT_ERP.Shared.Infrastructure.Messaging;

namespace PJT_ERP.Production.Api.Application.Production;

public class ProductionQueryService(
    ProductionContext db, 
    IEventPublisher eventPublisher,
    IMasterDataClient masterDataClient) : ProductionServiceBase(db, eventPublisher, masterDataClient), IProductionQueryService
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
}
