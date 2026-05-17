namespace PJT_ERP.Purchasing.Api.Domain.Entities;

public sealed class SalesOrderSnapshot
{
    public Guid SalesOrderId { get; set; }
    public string SalesOrderNumber { get; set; } = "";
    public Guid CustomerId { get; set; }
    public DateTime ConfirmedAtUtc { get; set; }
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;
    public List<MaterialRequirement> MaterialRequirements { get; set; } = [];
}
