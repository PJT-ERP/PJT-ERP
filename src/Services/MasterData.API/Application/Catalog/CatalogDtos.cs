namespace PJT_ERP.MasterData.Api.Application.Catalog;

public sealed record CustomerDto(
    Guid Id,
    string Code,
    string Name,
    string? Address,
    string? ContactPerson,
    string? Email,
    bool IsActive);

public sealed record CreateCustomerRequest(
    string Code,
    string Name,
    string? Address,
    string? ContactPerson,
    string? Email);

public sealed record ProductDto(
    Guid Id,
    string PartNumber,
    string Description,
    string Unit,
    string? MaterialSpec,
    bool IsActive,
    DateTime CreatedAtUtc,
    DateTime UpdatedAtUtc);

public sealed record CreateProductRequest(string PartNumber, string Description, string Unit, string? MaterialSpec);

public sealed record SupplierDto(
    Guid Id,
    string Code,
    string Name,
    string Type,
    string Category,
    string? City,
    string? Province,
    string? Address,
    string Status,
    string? BankName,
    string? BankAccount,
    string? BankBranch,
    string? Npwp,
    string? PaymentTerms,
    string? Since,
    double Rating,
    List<SupplierContactDto> Contacts,
    DateTime CreatedAtUtc,
    DateTime UpdatedAtUtc);

public sealed record SupplierContactDto(
    Guid Id,
    string Name,
    string? Role,
    string? Phone,
    string? Email,
    bool IsPrimary);

public sealed record CreateSupplierRequest(
    string Code,
    string Name,
    string Type,
    string Category,
    string? City,
    string? Province,
    string? Address,
    string Status,
    string? BankName,
    string? BankAccount,
    string? BankBranch,
    string? Npwp,
    string? PaymentTerms,
    string? Since,
    double Rating,
    List<CreateSupplierContactRequest> Contacts);

public sealed record CreateSupplierContactRequest(
    string Name,
    string? Role,
    string? Phone,
    string? Email,
    bool IsPrimary);
