namespace PJT_ERP.MasterData.Api.Domain.Entities;

public sealed class StockMutationLog
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid InventoryItemId { get; set; }
    public string ItemCode { get; set; } = "";
    public string ItemName { get; set; } = "";
    public string MutationType { get; set; } = ""; // "in" or "out"
    public decimal Quantity { get; set; } = 0;
    public string Reason { get; set; } = "";
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

    public InventoryItem? InventoryItem { get; set; }
}
