namespace PJT_ERP.EventBus.Messages.Events;

public sealed record PurchaseItemReceivedEvent(
    Guid PurchaseRequestId,
    string PrNumber,
    Guid PurchaseRequestItemId,
    string ItemName,
    int QuantityReceived,
    DateOnly ReceivedDate) : IntegrationEvent;
