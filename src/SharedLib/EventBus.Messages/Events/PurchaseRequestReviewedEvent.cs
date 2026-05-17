namespace PJT_ERP.EventBus.Messages.Events;

public record PurchaseRequestReviewedEvent(
    Guid PurchaseRequestId,
    string RequestNumber,
    string Decision,
    DateTime ReviewedAtUtc) : IntegrationEvent;
