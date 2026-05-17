namespace PJT_HIMTIKA.Purchasing.Api.Application.PurchaseRequests;

public interface IPurchaseRequestService
{
    Task<IReadOnlyCollection<PurchaseRequestDto>> ListAsync(CancellationToken cancellationToken);
    Task<PurchaseRequestDto> CreateAsync(CreatePurchaseRequest request, CancellationToken cancellationToken);
    Task<PurchaseRequestDto?> ReviewAsync(Guid id, ReviewPurchaseRequest request, CancellationToken cancellationToken);
}
