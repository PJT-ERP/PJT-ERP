namespace PJT_ERP.MasterData.Api.Domain.Entities;

public sealed class SupplierContact
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid SupplierId { get; set; }
    public string Name { get; set; } = "";
    public string? Role { get; set; }
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public bool IsPrimary { get; set; }
    
    public Supplier? Supplier { get; set; }
}
