namespace PJT_ERP.Purchasing.Api.Application.PurchaseRequests;

public interface IPurchaseRequestService
{
    Task<IReadOnlyCollection<PurchaseRequestDto>> ListAsync(Guid? salesOrderId, string? status, CancellationToken cancellationToken);
    Task<PurchaseRequestDto?> GetAsync(Guid id, CancellationToken cancellationToken);
    Task<PurchaseRequestDto> CreateAsync(CreatePurchaseRequest request, CancellationToken cancellationToken);
    Task<PurchaseRequestDto?> ReviewAsync(Guid id, ReviewPurchaseRequest request, CancellationToken cancellationToken);
    Task<PurchaseRequestDto?> UpdatePurchaseItemInfoAsync(Guid purchaseRequestId, Guid itemId, UpdatePurchaseItemInfoRequest request, CancellationToken cancellationToken);
    Task<PurchaseRequestDto?> ProcessPurchaseItemAsync(Guid purchaseRequestId, Guid itemId, ProcessPurchaseItemRequest request, CancellationToken cancellationToken);
    Task<PurchaseRequestDto?> RejectPurchaseItemAsync(Guid purchaseRequestId, Guid itemId, RejectPurchaseItemRequest request, CancellationToken cancellationToken);
    Task<PurchaseRequestDto?> ReceivePurchaseItemAsync(Guid purchaseRequestId, Guid itemId, ReceivePurchaseItemRequest request, CancellationToken cancellationToken);
    Task<MaterialRequirementDto?> UpdateMaterialRequirementStockAsync(Guid materialRequirementId, UpdateMaterialStockInfoRequest request, CancellationToken cancellationToken);
    Task<IReadOnlyCollection<MaterialRequirementDto>> ListMaterialRequirementsAsync(Guid? salesOrderId, string? status, CancellationToken cancellationToken);
    Task<SalesOrderMaterialTrackingDto?> GetSalesOrderMaterialTrackingAsync(Guid salesOrderId, CancellationToken cancellationToken);
}
