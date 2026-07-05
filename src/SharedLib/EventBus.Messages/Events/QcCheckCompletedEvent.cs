namespace PJT_ERP.EventBus.Messages.Events;

public record QcCheckCompletedEvent(
    Guid QcInspectionId,
    Guid ProductionOrderId,
    string Decision,
    DateTime CheckedAtUtc,
    IReadOnlyCollection<string> ProductionPhotos,
    IReadOnlyCollection<string> QcPhotos) : IntegrationEvent;
