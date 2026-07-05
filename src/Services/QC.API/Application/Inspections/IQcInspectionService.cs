using Microsoft.AspNetCore.Http;

namespace PJT_ERP.QC.Api.Application.Inspections;

public interface IQcInspectionService
{
    Task<IReadOnlyCollection<QcInspectionDto>> ListAsync(CancellationToken cancellationToken);
    Task<QcInspectionDto?> GetAsync(Guid id, CancellationToken cancellationToken);
    Task<QcInspectionDto?> UploadResultAsync(Guid id, UploadQcResultRequest request, CancellationToken cancellationToken);
    Task<IReadOnlyCollection<string>> UploadPhotosAsync(IFormFileCollection files, CancellationToken cancellationToken);
}
