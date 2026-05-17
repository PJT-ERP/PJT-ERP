namespace PJT_HIMTIKA.Purchasing.Api.Domain.Entities;

public sealed class PurchaseRequestItem
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid PurchaseRequestId { get; set; }
    public PurchaseRequest? PurchaseRequest { get; set; }
    public string ItemName { get; set; } = "";
    public string? Size { get; set; }
    public int Qty { get; set; }
    public string? SuggestedSupplier { get; set; }
    public string? Notes { get; set; }
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;
}
