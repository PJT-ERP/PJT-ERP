namespace PJT_HIMTIKA.QC.Api.Application.Inspections;

public interface IQcInspectionService
{
    Task<IReadOnlyCollection<QcInspectionDto>> ListAsync(CancellationToken cancellationToken);
    Task<QcInspectionDto?> GetAsync(Guid id, CancellationToken cancellationToken);
    Task<QcInspectionDto?> StartAsync(Guid id, StartInspectionRequest request, CancellationToken cancellationToken);
    Task<QcVisualCheckDto?> AddVisualCheckAsync(Guid inspectionId, CreateVisualCheckRequest request, CancellationToken cancellationToken);
    Task<QcDimensionCheckDto?> AddDimensionCheckAsync(Guid inspectionId, CreateDimensionCheckRequest request, CancellationToken cancellationToken);
    Task<QcInspectionDto?> SubmitAsync(Guid id, SubmitInspectionRequest request, CancellationToken cancellationToken);
    Task<QcInspectionDto?> ReviewAsync(Guid id, ReviewInspectionRequest request, CancellationToken cancellationToken);
}
