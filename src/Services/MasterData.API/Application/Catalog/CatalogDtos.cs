namespace PJT_ERP.MasterData.Api.Application.Catalog;

public sealed record CustomerDto(
    Guid Id,
    string Code,
    string Name,
    string? Address,
    string? ContactPerson,
    string? Email,
    string? Phone,
    bool IsActive);

public sealed record CreateCustomerRequest(
    string? Code,
    string Name,
    string? Address,
    string? ContactPerson,
    string? Email,
    string? Phone);

public sealed record UpdateCustomerRequest(
    string Name,
    string? Address,
    string? ContactPerson,
    string? Email,
    string? Phone,
    bool IsActive);

public sealed record ProductBomItemDto(
    Guid Id,
    Guid InventoryItemId,
    string InventoryItemCode,
    string InventoryItemName,
    decimal Quantity,
    string Unit);

public sealed record ProductDto(
    Guid Id,
    string PartNumber,
    string Description,
    string Unit,
    string? MaterialSpec,
    bool IsActive,
    List<ProductBomItemDto> BomItems,
    DateTime CreatedAtUtc,
    DateTime UpdatedAtUtc);

public sealed record UpdateProductBomRequest(List<CreateProductBomItemRequest> BomItems);
public sealed record CreateProductBomItemRequest(Guid InventoryItemId, decimal Quantity);

public sealed record CreateProductRequest(string PartNumber, string Description, string Unit, string? MaterialSpec, List<CreateProductBomItemRequest>? BomItems);

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

public sealed record UpdateSupplierRequest(
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
