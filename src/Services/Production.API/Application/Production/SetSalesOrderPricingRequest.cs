namespace PJT_ERP.Production.Api.Application.Production;

public sealed record SetSalesOrderPricingRequest(
    List<SetSalesOrderPricingItemRequest> Items);

public sealed record SetSalesOrderPricingItemRequest(
    Guid SalesOrderItemId,
    decimal UnitPrice);
