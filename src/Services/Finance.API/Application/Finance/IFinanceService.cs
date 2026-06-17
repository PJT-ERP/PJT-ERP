namespace PJT_ERP.Finance.Api.Application.Finance;

public interface IFinanceService
{
    Task<IReadOnlyCollection<InvoiceCandidateDto>> ListInvoiceCandidatesAsync(Guid? customerId, CancellationToken cancellationToken);
    Task<IReadOnlyCollection<InvoiceDto>> ListInvoicesAsync(
        Guid? customerId,
        DateOnly? dueFrom,
        DateOnly? dueTo,
        string? status,
        string? sortBy,
        CancellationToken cancellationToken);
    Task<InvoiceDto?> GetInvoiceAsync(Guid invoiceId, CancellationToken cancellationToken);
    Task<InvoiceDto> CreateInvoiceAsync(CreateInvoiceRequest request, CancellationToken cancellationToken);
    Task<InvoiceDto?> RecordPaymentAsync(Guid invoiceId, RecordPaymentRequest request, CancellationToken cancellationToken);
    Task<IReadOnlyCollection<PaymentVerificationRequestDto>> ListPaymentVerificationsAsync(string? status, CancellationToken cancellationToken);
    Task<PaymentVerificationRequestDto?> SubmitPaymentProofAsync(Guid invoiceId, SubmitPaymentProofFormRequest request, CancellationToken cancellationToken);
    Task<PaymentVerificationRequestDto?> VerifyPaymentProofAsync(Guid requestId, CancellationToken cancellationToken);
    Task<PaymentVerificationRequestDto?> RejectPaymentProofAsync(Guid requestId, RejectPaymentVerificationRequest request, CancellationToken cancellationToken);
    Task<InvoiceDto?> CreateCollectionLetterAsync(Guid invoiceId, CreateCollectionLetterRequest request, CancellationToken cancellationToken);
    Task<FinanceDashboardDto> GetDashboardAsync(Guid? customerId, CancellationToken cancellationToken);
}
