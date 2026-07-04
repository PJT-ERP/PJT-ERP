namespace PJT_ERP.Production.Api.Application.Production;

public sealed record StartReadinessResponse(
    bool CanStart,
    IReadOnlyCollection<StartReadinessStockIssue> StockIssues,
    IReadOnlyCollection<StartReadinessBomItem> BomItems);

public sealed record StartReadinessStockIssue(
    string InventoryItemId,
    string ItemName,
    int Required,
    int Available);

public sealed record StartReadinessBomItem(
    string InventoryItemId,
    int Quantity);
