namespace PJT_ERP.Production.Api.Application.Production;

public interface IProductionQueryService
{
    Task<IReadOnlyCollection<SalesOrderDto>> ListSalesOrdersAsync(CancellationToken cancellationToken);
    Task<SalesOrderProductionProgressDto?> GetSalesOrderProgressAsync(Guid salesOrderId, CancellationToken cancellationToken);
    Task<SalesOrderProductionProgressDto?> GetSalesOrderTrackingByCodeAsync(string trackingCode, CancellationToken cancellationToken);
    Task<PublicProductionTrackingDto?> GetPublicTrackingAsync(string trackingCode, CancellationToken cancellationToken);
    Task<ExecutiveDashboardDto> GetExecutiveDashboardAsync(CancellationToken cancellationToken);
}
