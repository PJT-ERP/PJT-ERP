namespace PJT_ERP.Production.Api.Application.Production;

public interface ISalesOrderCommandService
{
    Task<SalesOrderDto> CreateSalesOrderAsync(CreateSalesOrderRequest request, CancellationToken cancellationToken);
    Task<SalesOrderDto> CreateCompleteSalesOrderAsync(CompleteSalesOrderRequest request, CancellationToken cancellationToken);
    Task<SalesOrderDto?> AssignSalesOrderEngineersAsync(Guid salesOrderId, AssignSalesOrderEngineersRequest request, CancellationToken cancellationToken);
    Task<SalesOrderDto?> UpdateSalesOrderDesignStatusAsync(Guid salesOrderId, UpdateSalesOrderDesignStatusRequest request, CancellationToken cancellationToken);
    Task<SalesOrderDto?> SubmitSalesOrderDesignAsync(Guid salesOrderId, SubmitSalesOrderDesignRequest request, CancellationToken cancellationToken);
    Task<SalesOrderDto?> UpdateSalesOrderItemsAsync(Guid salesOrderId, UpdateSalesOrderItemsRequest request, CancellationToken cancellationToken);
    Task<SalesOrderDto?> UpdateCustomerDrawingUrlAsync(Guid salesOrderId, UpdateCustomerDrawingUrlRequest request, CancellationToken cancellationToken);
    Task<SalesOrderDto?> SetSalesOrderPricingAsync(Guid salesOrderId, SetSalesOrderPricingRequest request, CancellationToken cancellationToken);
    Task<SalesOrderProductionProgressDto> ConfirmSalesOrderAsync(Guid salesOrderId, ConfirmSalesOrderRequest request, CancellationToken cancellationToken);
    Task<SalesOrderDto?> UpdateSalesOrderGeneralAsync(Guid salesOrderId, UpdateSalesOrderGeneralRequest request, CancellationToken cancellationToken);
    Task<bool> DeleteSalesOrderAsync(Guid salesOrderId, CancellationToken cancellationToken);
    Task<SalesOrderCommentDto?> AddCommentAsync(Guid salesOrderId, AddSalesOrderCommentRequest request, CancellationToken cancellationToken);
    Task<bool> UpdateCommentAsync(Guid salesOrderId, Guid commentId, UpdateSalesOrderCommentRequest request, CancellationToken cancellationToken);
    Task<bool> DeleteCommentAsync(Guid salesOrderId, Guid commentId, CancellationToken cancellationToken);
}
