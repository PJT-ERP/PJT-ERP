namespace PJT_ERP.Production.Api.Domain.Entities;

public sealed class SalesOrderItem
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid SalesOrderId { get; set; }
    public SalesOrder? SalesOrder { get; set; }
    public Guid ProductId { get; set; }
    public string ProductPartNumber { get; set; } = "";
    public string ProductDescription { get; set; } = "";
    public string? ProductMaterialSpec { get; set; }
    public int Qty { get; set; }
    public decimal UnitPrice { get; set; }
    public string? Notes { get; set; }
    public string? DesignReference { get; set; }
    public string? CustomerDrawingUrl { get; set; }
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;
    public List<ProductionOrder> ProductionOrders { get; set; } = [];
}
