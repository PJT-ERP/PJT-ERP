namespace PJT_ERP.Production.Api.Application.Production;

public interface IProductionService
{
    Task<IReadOnlyCollection<SalesOrderDto>> ListSalesOrdersAsync(CancellationToken cancellationToken);
    Task<SalesOrderDto> CreateSalesOrderAsync(CreateSalesOrderRequest request, CancellationToken cancellationToken);
    Task<SalesOrderDto?> AssignSalesOrderEngineersAsync(Guid salesOrderId, AssignSalesOrderEngineersRequest request, CancellationToken cancellationToken);
    Task<SalesOrderDto?> UpdateSalesOrderDesignStatusAsync(Guid salesOrderId, UpdateSalesOrderDesignStatusRequest request, CancellationToken cancellationToken);
    Task<SalesOrderDto?> SubmitSalesOrderDesignAsync(Guid salesOrderId, SubmitSalesOrderDesignRequest request, CancellationToken cancellationToken);
    Task<SalesOrderDto?> UpdateSalesOrderItemsAsync(Guid salesOrderId, UpdateSalesOrderItemsRequest request, CancellationToken cancellationToken);
    Task<SalesOrderDto?> UpdateCustomerDrawingUrlAsync(Guid salesOrderId, UpdateCustomerDrawingUrlRequest request, CancellationToken cancellationToken);
    Task<SalesOrderDto?> SetSalesOrderPricingAsync(Guid salesOrderId, SetSalesOrderPricingRequest request, CancellationToken cancellationToken);
    Task<SalesOrderProductionProgressDto> ConfirmSalesOrderAsync(Guid salesOrderId, ConfirmSalesOrderRequest request, CancellationToken cancellationToken);
    Task<SalesOrderProductionProgressDto?> GetSalesOrderProgressAsync(Guid salesOrderId, CancellationToken cancellationToken);
    Task<SalesOrderProductionProgressDto?> GetSalesOrderTrackingByCodeAsync(string trackingCode, CancellationToken cancellationToken);
    Task<PublicProductionTrackingDto?> GetPublicTrackingAsync(string trackingCode, CancellationToken cancellationToken);
    Task<SalesOrderProductionProgressDto?> UploadEngineeringDrawingAsync(Guid salesOrderId, UploadEngineeringDrawingRequest request, CancellationToken cancellationToken);
    Task<SalesOrderProductionProgressDto?> SubmitMaterialRequestAsync(Guid salesOrderId, SubmitProductionMaterialRequest request, CancellationToken cancellationToken, bool isPrivileged = false);
    Task<SalesOrderProductionProgressDto?> StartProductionAsync(Guid salesOrderId, ProductionStatusUpdateRequest request, CancellationToken cancellationToken, bool isPrivileged = false);
    Task<SalesOrderProductionProgressDto?> FinishProductionAsync(Guid salesOrderId, ProductionStatusUpdateRequest request, CancellationToken cancellationToken, bool isPrivileged = false);
    Task<SalesOrderProductionProgressDto?> PauseProductionAsync(Guid salesOrderId, ProductionStatusUpdateRequest request, CancellationToken cancellationToken, bool isPrivileged = false);
    Task<SalesOrderProductionProgressDto?> ResumeProductionAsync(Guid salesOrderId, ProductionStatusUpdateRequest request, CancellationToken cancellationToken, bool isPrivileged = false);
    Task<ExecutiveDashboardDto> GetExecutiveDashboardAsync(CancellationToken cancellationToken);
}
