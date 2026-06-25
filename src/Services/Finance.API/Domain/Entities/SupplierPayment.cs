namespace PJT_ERP.Finance.Api.Domain.Entities;

public sealed class SupplierPayment
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string PoNumber { get; set; } = "";
    public string SupplierName { get; set; } = "";
    public DateOnly PaymentDate { get; set; }
    public decimal Amount { get; set; }
    public string BankName { get; set; } = "";
    public string? BankReference { get; set; }
    public string? ProofFileName { get; set; }
    public string? ProofFileUrl { get; set; }
    public string? Notes { get; set; }
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
}
