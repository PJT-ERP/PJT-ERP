namespace PJT_HIMTIKA.EventBus.Messages.Events;

public record SpkCreatedEvent(
    Guid ProductionOrderId,
    Guid SalesOrderId,
    string SpkNumber,
    string BarcodeValue,
    Guid ProductId,
    decimal Quantity,
    string ProductCode = "",
    string ProductName = "",
    string? DrawingRef = null,
    string? MaterialSpec = null) : IntegrationEvent;
