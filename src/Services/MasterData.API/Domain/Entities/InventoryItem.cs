namespace PJT_ERP.MasterData.Api.Domain.Entities;

public sealed class InventoryItem
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Code { get; set; } = "";
    public string Name { get; set; } = "";
    public string Category { get; set; } = "";
    public string Unit { get; set; } = "pcs";
    public decimal CurrentStock { get; set; } = 0;
    public decimal MinStock { get; set; } = 0;
    public decimal MaxStock { get; set; } = 0;
    public decimal ReorderPoint { get; set; } = 0;
    public string Location { get; set; } = "";
    public string SupplierName { get; set; } = "";
    public decimal UnitPrice { get; set; } = 0;
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;
}
