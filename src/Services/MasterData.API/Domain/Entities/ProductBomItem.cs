namespace PJT_ERP.MasterData.Api.Domain.Entities;

public sealed class ProductBomItem
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ProductId { get; set; }
    public Guid InventoryItemId { get; set; }
    public decimal Quantity { get; set; }
    
    // Navigation properties
    public Product Product { get; set; } = null!;
    public InventoryItem InventoryItem { get; set; } = null!;
}
