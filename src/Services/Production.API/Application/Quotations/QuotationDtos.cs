namespace PJT_ERP.Production.Api.Application.Quotations;

public sealed record CreateQuotationRequest(
    Guid CustomerId,
    DateOnly Deadline,
    string? Notes,
    IReadOnlyCollection<CreateQuotationItemRequest> Items,
    CreateQuotationCustomerSnapshotRequest? Customer = null);

public sealed record CreateQuotationCustomerSnapshotRequest(
    string Code,
    string Name,
    string? Email);

public sealed record CreateQuotationItemRequest(
    Guid? ProductId,
    string ProductName,
    string? Description,
    int Quantity,
    string Unit,
    string? CustomerImageUrl,
    string? DesignLink,
    IReadOnlyCollection<QuotationBomItemRequest>? BomItems);

public sealed record QuotationBomItemRequest(
    string? ItemCode,
    string Name,
    string? Specification,
    decimal Quantity,
    string Unit);

public sealed record AssignQuotationEngineerRequest(Guid EngineerId, string EngineerName);

public sealed record SubmitQuotationDesignRequest(
    string DesignLink,
    IReadOnlyCollection<QuotationBomItemRequest> BomItems,
    Guid EngineerId,
    string EngineerName);

public sealed record RequestQuotationRevisionRequest(string? Notes);

public sealed record SubmitQuotationPricingRequest(
    decimal Amount,
    string? Notes,
    Guid FinanceUserId,
    string FinanceUserName);

public sealed record MarkQuotationLostRequest(string Reason);

public sealed record ConvertQuotationToSalesOrderRequest(decimal DpPercentage, DateOnly DueDate);

public sealed record QuotationDto(
    Guid Id,
    string QuotationNumber,
    Guid CustomerId,
    string CustomerCode,
    string CustomerName,
    string? CustomerEmail,
    DateOnly Deadline,
    string Status,
    Guid? AssignedEngineerId,
    string? AssignedEngineerName,
    string? DesignLink,
    decimal? EstimatedAmount,
    string? LostReason,
    Guid? ConvertedSalesOrderId,
    string? ConvertedSalesOrderNumber,
    DateTime CreatedAtUtc,
    DateTime UpdatedAtUtc,
    IReadOnlyCollection<QuotationItemDto> Items,
    IReadOnlyCollection<QuotationBomItemDto> BomItems,
    IReadOnlyCollection<QuotationRevisionDto> Revisions);

public sealed record QuotationItemDto(
    Guid Id,
    Guid? ProductId,
    string ProductName,
    string? Description,
    int Quantity,
    string Unit,
    string? CustomerImageUrl,
    string? DesignLink);

public sealed record QuotationBomItemDto(
    Guid Id,
    Guid? QuotationItemId,
    string? ItemCode,
    string Name,
    string? Specification,
    decimal Quantity,
    string Unit);

public sealed record QuotationRevisionDto(
    int RevisionNumber,
    decimal Amount,
    DateOnly Date,
    string? Notes);

