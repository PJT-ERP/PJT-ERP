namespace PJT_ERP.Production.Api.Domain.Entities;

public sealed class Quotation
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string QuotationNumber { get; set; } = "";
    public Guid CustomerId { get; set; }
    public string CustomerCode { get; set; } = "";
    public string CustomerName { get; set; } = "";
    public string? CustomerEmail { get; set; }
    public DateOnly Deadline { get; set; }
    public string? Notes { get; set; }
    public string Status { get; set; } = QuotationStatuses.Draft;
    public Guid? AssignedEngineerId { get; set; }
    public string? AssignedEngineerName { get; set; }
    public string? DesignLink { get; set; }
    public decimal? EstimatedAmount { get; set; }
    public string? LostReason { get; set; }
    public Guid? ConvertedSalesOrderId { get; set; }
    public string? ConvertedSalesOrderNumber { get; set; }
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;
    public List<QuotationItem> Items { get; set; } = [];
    public List<QuotationBomItem> BomItems { get; set; } = [];
    public List<QuotationPriceRevision> PriceRevisions { get; set; } = [];
}

public sealed class QuotationItem
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid QuotationId { get; set; }
    public Quotation? Quotation { get; set; }
    public Guid? ProductId { get; set; }
    public string ProductName { get; set; } = "";
    public string? Description { get; set; }
    public int Quantity { get; set; }
    public string Unit { get; set; } = "";
    public string? CustomerImageUrl { get; set; }
    public string? DesignLink { get; set; }
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;
}

public sealed class QuotationBomItem
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid QuotationId { get; set; }
    public Quotation? Quotation { get; set; }
    public Guid? QuotationItemId { get; set; }
    public string? ItemCode { get; set; }
    public string Name { get; set; } = "";
    public string? Specification { get; set; }
    public decimal Quantity { get; set; }
    public string Unit { get; set; } = "";
}

public sealed class QuotationPriceRevision
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid QuotationId { get; set; }
    public Quotation? Quotation { get; set; }
    public int RevisionNumber { get; set; }
    public decimal Amount { get; set; }
    public DateOnly RevisionDate { get; set; }
    public string? Notes { get; set; }
    public Guid FinanceUserId { get; set; }
    public string FinanceUserName { get; set; } = "";
}

public static class QuotationStatuses
{
    public const string Draft = "draft";
    public const string PendingDesign = "pending_design";
    public const string DesignReview = "design_review";
    public const string ClientDesignApproval = "client_design_approval";
    public const string WaitingPricing = "waiting_pricing";
    public const string ClientPriceApproval = "client_price_approval";
    public const string Won = "won";
    public const string Lost = "lost";
}
