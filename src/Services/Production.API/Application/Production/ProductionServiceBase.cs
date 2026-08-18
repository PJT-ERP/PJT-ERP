using Microsoft.EntityFrameworkCore;
using PJT_ERP.EventBus.Messages.Events;
using PJT_ERP.Production.Api.Domain.Entities;
using PJT_ERP.Production.Api.Infrastructure.Persistence;
using PJT_ERP.Shared.Infrastructure.Messaging;

namespace PJT_ERP.Production.Api.Application.Production;

public abstract partial class ProductionServiceBase
{
    protected readonly ProductionContext db;
    protected readonly IEventPublisher eventPublisher;
    protected readonly IMasterDataClient masterDataClient;

    protected ProductionServiceBase(
        ProductionContext db, 
        IEventPublisher eventPublisher,
        IMasterDataClient masterDataClient)
    {
        this.db = db;
        this.eventPublisher = eventPublisher;
        this.masterDataClient = masterDataClient;
    }

    protected async Task<string> GenerateSalesOrderNumberAsync(CancellationToken cancellationToken)
    {
        var prefix = $"SO-{DateTime.UtcNow:yyyy}-";
        var existingNumbers = await db.SalesOrders
            .AsNoTracking()
            .Where(order => order.SoNumber.StartsWith(prefix))
            .Select(order => order.SoNumber)
            .ToListAsync(cancellationToken);

        return $"{prefix}{NextSequence(existingNumbers, prefix):000}";
    }

    protected async Task<SalesOrderProductionProgressDto?> GetSalesOrderProgressInternalAsync(Guid salesOrderId, CancellationToken cancellationToken)
    {
        var salesOrder = await IncludeProduction(db.SalesOrders.AsNoTracking())
            .FirstOrDefaultAsync(order => order.Id == salesOrderId, cancellationToken);

        return salesOrder is null ? null : ToProgressDto(salesOrder);
    }

    protected static int NextSequence(IEnumerable<string> existingNumbers, string prefix)
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
