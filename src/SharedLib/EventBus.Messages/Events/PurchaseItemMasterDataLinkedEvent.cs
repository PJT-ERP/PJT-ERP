namespace PJT_ERP.EventBus.Messages.Events;

public record PurchaseItemMasterDataLinkedEvent(
    Guid PurchaseRequestItemId,
    string NewItemName) : IntegrationEvent;
