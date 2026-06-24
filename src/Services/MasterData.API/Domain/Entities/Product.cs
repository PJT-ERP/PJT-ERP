namespace PJT_ERP.MasterData.Api.Domain.Entities;

public sealed class Product
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string PartNumber { get; set; } = "";
    public string Description { get; set; } = "";
    public string Unit { get; set; } = "pcs";
    public string? MaterialSpec { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;
    
    public List<ProductBomItem> BomItems { get; set; } = new();
}
