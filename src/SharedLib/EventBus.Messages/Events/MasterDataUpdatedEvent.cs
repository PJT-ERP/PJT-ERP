namespace PJT_ERP.EventBus.Messages.Events;

public record MasterDataUpdatedEvent(
    Guid EntityId,
    string EntityType,
    string Action,
    string Code,
    string Name,
    string? Unit = null,
    string? MaterialSpec = null,
    string? Email = null) : IntegrationEvent;
