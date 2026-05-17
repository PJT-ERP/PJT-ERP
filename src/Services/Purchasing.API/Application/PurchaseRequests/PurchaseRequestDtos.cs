namespace PJT_HIMTIKA.Purchasing.Api.Application.PurchaseRequests;

public sealed record CreatePurchaseRequest(
    DateOnly RequestDate,
    Guid RequestedByUserId,
    string RequesterName,
    IReadOnlyCollection<CreatePurchaseRequestItem> Items);

public sealed record CreatePurchaseRequestItem(
    string ItemName,
    string? Size,
    int Qty,
    string? SuggestedSupplier,
    string? Notes);

public sealed record ReviewPurchaseRequest(Guid ReviewedByUserId, string Decision, string? RejectionReason);

public sealed record PurchaseRequestDto(
    Guid Id,
    string PrNumber,
    DateOnly RequestDate,
    Guid RequestedByUserId,
    string RequesterName,
    string Status,
    Guid? ReviewedByUserId,
    DateTime? ReviewedAtUtc,
    string? RejectionReason,
    DateTime UpdatedAtUtc,
    IReadOnlyCollection<PurchaseRequestItemDto> Items);

public sealed record PurchaseRequestItemDto(
    Guid Id,
    string ItemName,
    string? Size,
    int Qty,
    string? SuggestedSupplier,
    string? Notes);
