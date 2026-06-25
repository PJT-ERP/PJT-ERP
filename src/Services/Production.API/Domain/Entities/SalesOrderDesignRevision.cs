namespace PJT_ERP.Production.Api.Domain.Entities;

public sealed class SalesOrderDesignRevision
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid SalesOrderId { get; set; }
    public SalesOrder? SalesOrder { get; set; }
    public int Version { get; set; }
    public string Url { get; set; } = "";
    public string ChangedBy { get; set; } = "";
    public DateTime ChangedAtUtc { get; set; } = DateTime.UtcNow;
}
