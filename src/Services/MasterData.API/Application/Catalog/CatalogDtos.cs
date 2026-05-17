namespace PJT_ERP.MasterData.Api.Application.Catalog;

public sealed record CustomerDto(Guid Id, string Code, string Name, string? Address, string? ContactPerson, bool IsActive);
public sealed record CreateCustomerRequest(string Code, string Name, string? Address, string? ContactPerson);

public sealed record ProductDto(Guid Id, string PartNumber, string Description, string Unit, string? MaterialSpec, bool IsActive);
public sealed record CreateProductRequest(string PartNumber, string Description, string Unit, string? MaterialSpec);
