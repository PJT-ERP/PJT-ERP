namespace PJT_ERP.MasterData.Api.Domain.Entities;

public sealed class Supplier
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Code { get; set; } = "";
    public string Name { get; set; } = "";
    public string Type { get; set; } = "";
    public string Category { get; set; } = "";
    public string? City { get; set; }
    public string? Province { get; set; }
    public string? Address { get; set; }
    public string Status { get; set; } = "Active";
    public string? BankName { get; set; }
    public string? BankAccount { get; set; }
    public string? BankBranch { get; set; }
    public string? Npwp { get; set; }
    public string? PaymentTerms { get; set; }
    public string? Since { get; set; }
    public double Rating { get; set; }
    
    public ICollection<SupplierContact> Contacts { get; set; } = new List<SupplierContact>();
    
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;
}
