namespace PJT_HIMTIKA.EventBus.Messages.Events;

public record ProductionFinishedEvent(
    Guid ProductionOrderId,
    string SpkNumber,
    string BarcodeValue,
    DateTime FinishedAtUtc) : IntegrationEvent;
