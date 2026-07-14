namespace PJT_ERP.EventBus.Messages.Events;

public record PurchaseRequestFinanceApprovedEvent(
    Guid PurchaseRequestId,
    string RequestNumber,
    IReadOnlyCollection<PurchaseRequestFinanceApprovedItem> Items) : IntegrationEvent;

public record PurchaseRequestFinanceApprovedItem(
    Guid PurchaseRequestItemId,
    string ItemName,
    string PurchaseCategory,
    int Quantity,
    string Unit);
