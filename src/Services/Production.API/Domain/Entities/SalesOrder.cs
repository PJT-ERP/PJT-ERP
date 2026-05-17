namespace PJT_HIMTIKA.Production.Api.Domain.Entities;

public sealed class SalesOrder
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string SoNumber { get; set; } = "";
    public Guid CustomerId { get; set; }
    public string CustomerCode { get; set; } = "";
    public string CustomerName { get; set; } = "";
    public DateOnly SoDate { get; set; } = DateOnly.FromDateTime(DateTime.UtcNow);
    public DateOnly? TargetDate { get; set; }
    public string Status { get; set; } = SalesOrderStatuses.Draft;
    public Guid? ApprovedByUserId { get; set; }
    public DateTime? ApprovedAtUtc { get; set; }
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;
    public List<SalesOrderItem> Items { get; set; } = [];
}

public static class SalesOrderStatuses
{
    public const string Draft = "Draft";
    public const string Confirmed = "Confirmed";
    public const string InProduction = "InProduction";
    public const string Completed = "Completed";
    public const string Cancelled = "Cancelled";
}
