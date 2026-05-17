namespace PJT_ERP.Production.Api.Domain.Entities;

public sealed class ProductReplica
{
    public Guid Id { get; set; }
    public string PartNumber { get; set; } = "";
    public string Description { get; set; } = "";
    public string Unit { get; set; } = "pcs";
    public string? MaterialSpec { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;
}
