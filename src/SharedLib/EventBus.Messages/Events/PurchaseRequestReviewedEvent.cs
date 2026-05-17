namespace PJT_HIMTIKA.EventBus.Messages.Events;

public record PurchaseRequestReviewedEvent(
    Guid PurchaseRequestId,
    string RequestNumber,
    string Decision,
    DateTime ReviewedAtUtc) : IntegrationEvent;
