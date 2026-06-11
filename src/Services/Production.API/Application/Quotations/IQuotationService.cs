using PJT_ERP.Production.Api.Application.Production;

namespace PJT_ERP.Production.Api.Application.Quotations;

public interface IQuotationService
{
    Task<IReadOnlyCollection<QuotationDto>> ListAsync(string? status, Guid? customerId, CancellationToken cancellationToken);
    Task<QuotationDto?> GetAsync(Guid quotationId, CancellationToken cancellationToken);
    Task<QuotationDto> CreateAsync(CreateQuotationRequest request, CancellationToken cancellationToken);
    Task<QuotationDto?> AssignEngineerAsync(Guid quotationId, AssignQuotationEngineerRequest request, CancellationToken cancellationToken);
    Task<QuotationDto?> SubmitDesignAsync(Guid quotationId, SubmitQuotationDesignRequest request, CancellationToken cancellationToken);
    Task<QuotationDto?> ApproveDesignBySupervisorAsync(Guid quotationId, CancellationToken cancellationToken);
    Task<QuotationDto?> ApproveClientDesignAsync(Guid quotationId, CancellationToken cancellationToken);
    Task<QuotationDto?> RequestDesignRevisionAsync(Guid quotationId, RequestQuotationRevisionRequest request, CancellationToken cancellationToken);
    Task<QuotationDto?> SubmitPricingAsync(Guid quotationId, SubmitQuotationPricingRequest request, CancellationToken cancellationToken);
    Task<QuotationDto?> MarkWonAsync(Guid quotationId, CancellationToken cancellationToken);
    Task<QuotationDto?> MarkLostAsync(Guid quotationId, MarkQuotationLostRequest request, CancellationToken cancellationToken);
    Task<SalesOrderDto?> ConvertToSalesOrderAsync(Guid quotationId, ConvertQuotationToSalesOrderRequest request, CancellationToken cancellationToken);
}
