namespace PJT_ERP.Production.Api.Application.Production;

public interface IProductionCommandService
{
    Task<SalesOrderProductionProgressDto?> UploadEngineeringDrawingAsync(Guid salesOrderId, UploadEngineeringDrawingRequest request, CancellationToken cancellationToken, bool isPrivileged = false);
    Task<SalesOrderProductionProgressDto?> SubmitMaterialRequestAsync(Guid salesOrderId, SubmitProductionMaterialRequest request, CancellationToken cancellationToken, bool isPrivileged = false);
    Task<SalesOrderProductionProgressDto?> StartProductionAsync(Guid salesOrderId, ProductionStatusUpdateRequest request, CancellationToken cancellationToken, bool isPrivileged = false);
    Task<SalesOrderProductionProgressDto?> FinishProductionAsync(Guid salesOrderId, ProductionStatusUpdateRequest request, CancellationToken cancellationToken, bool isPrivileged = false);
    Task<SalesOrderProductionProgressDto?> PauseProductionAsync(Guid salesOrderId, ProductionStatusUpdateRequest request, CancellationToken cancellationToken, bool isPrivileged = false);
    Task<SalesOrderProductionProgressDto?> ResumeProductionAsync(Guid salesOrderId, ProductionStatusUpdateRequest request, CancellationToken cancellationToken, bool isPrivileged = false);
}
