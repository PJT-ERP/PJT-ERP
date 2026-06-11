namespace PJT_ERP.EventBus.Messages.Events;

public record MaterialRequestSubmittedEvent(
    Guid SalesOrderId,
    string SalesOrderNumber,
    Guid ProductionOrderId,
    string? TrackingBarcodeUid,
    Guid RequestedByUserId,
    string RequesterName,
    DateOnly RequestDate,
    string ProjectName,
    string? Notes,
    IReadOnlyCollection<MaterialRequestSubmittedItem> Items) : IntegrationEvent;

public record MaterialRequestSubmittedItem(
    Guid? MaterialRequirementId,
    Guid? SalesOrderItemId,
    string ItemName,
    string? Size,
    int Qty,
    string Urgency,
    string? SuggestedSupplier = null,
    string? Notes = null,
    string? PurchaseCategory = null);
