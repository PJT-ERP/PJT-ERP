namespace PJT_HIMTIKA.EventBus.Messages.Events;

public record QcCheckCompletedEvent(
    Guid QcInspectionId,
    Guid ProductionOrderId,
    string Decision,
    DateTime CheckedAtUtc) : IntegrationEvent;
