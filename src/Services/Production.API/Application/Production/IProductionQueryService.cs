namespace PJT_ERP.Production.Api.Application.Production;

public interface IProductionQueryService
{
    Task<IReadOnlyCollection<SalesOrderDto>> ListSalesOrdersAsync(CancellationToken cancellationToken);
    Task<SalesOrderProductionProgressDto?> GetSalesOrderProgressAsync(Guid salesOrderId, CancellationToken cancellationToken);
    Task<SalesOrderProductionProgressDto?> GetSalesOrderTrackingByCodeAsync(string trackingCode, CancellationToken cancellationToken);
    Task<PublicProductionTrackingDto?> GetPublicTrackingAsync(string trackingCode, CancellationToken cancellationToken);
    Task<ExecutiveDashboardDto> GetExecutiveDashboardAsync(CancellationToken cancellationToken);
    Task<ProductionQueuesDto> GetProductionQueuesAsync(Guid? userId, string userRole, CancellationToken cancellationToken);
    Task<EngineeringQueuesDto> GetEngineeringQueuesAsync(Guid? userId, string userRole, CancellationToken cancellationToken);
    Task<FinanceCostingQueuesDto> GetFinanceCostingQueuesAsync(CancellationToken cancellationToken);
    Task<ApprovalQueuesDto> GetApprovalQueuesAsync(CancellationToken cancellationToken);
    Task<DashboardCountersDto> GetDashboardCountersAsync(Guid? userId, string userRole, CancellationToken cancellationToken);
    Task<QcQueuesDto> GetQcQueuesAsync(CancellationToken cancellationToken);
    Task<ProductionBoardQueuesDto> GetProductionBoardQueuesAsync(Guid? userId, string userRole, CancellationToken cancellationToken);
}
