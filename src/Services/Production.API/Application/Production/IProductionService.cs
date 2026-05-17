namespace PJT_HIMTIKA.Production.Api.Application.Production;

public interface IProductionService
{
    Task<IReadOnlyCollection<SalesOrderDto>> ListSalesOrdersAsync(CancellationToken cancellationToken);
    Task<SalesOrderDto> CreateSalesOrderAsync(CreateSalesOrderRequest request, CancellationToken cancellationToken);
    Task<IReadOnlyCollection<ProductionOrderDto>> ConfirmSalesOrderAsync(Guid salesOrderId, ConfirmSalesOrderRequest request, CancellationToken cancellationToken);
    Task<SalesOrderProductionProgressDto?> GetSalesOrderProgressAsync(Guid salesOrderId, CancellationToken cancellationToken);
    Task<PublicProductionTrackingDto?> GetPublicTrackingAsync(string trackingCode, CancellationToken cancellationToken);
    Task<IReadOnlyCollection<ProductionOrderDto>> ListProductionOrdersAsync(Guid? salesOrderId, CancellationToken cancellationToken);
    Task<ProductionOrderDto?> GetProductionOrderAsync(Guid productionOrderId, CancellationToken cancellationToken);
    Task<ProductionOrderDto?> GetProductionOrderByBarcodeAsync(string barcodeUid, CancellationToken cancellationToken);
    Task<ProductionOrderDto?> UploadEngineeringDrawingAsync(Guid productionOrderId, UploadEngineeringDrawingRequest request, CancellationToken cancellationToken);
    Task<ProductionOrderDto?> ScanAsync(ScanProductionOrderRequest request, CancellationToken cancellationToken);
    Task<ExecutiveDashboardDto> GetExecutiveDashboardAsync(CancellationToken cancellationToken);
}
