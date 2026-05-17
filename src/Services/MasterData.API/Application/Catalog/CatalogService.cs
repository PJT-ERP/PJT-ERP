using Microsoft.EntityFrameworkCore;
using PJT_ERP.EventBus.Messages.Events;
using PJT_ERP.MasterData.Api.Domain.Entities;
using PJT_ERP.MasterData.Api.Infrastructure.Persistence;
using PJT_ERP.Shared.Infrastructure.Messaging;

namespace PJT_ERP.MasterData.Api.Application.Catalog;

public sealed class CatalogService(MasterDataContext db, IEventPublisher eventPublisher) : ICatalogService
{
    public async Task<IReadOnlyCollection<CustomerDto>> ListCustomersAsync(CancellationToken cancellationToken)
    {
        return await db.Customers
            .AsNoTracking()
            .OrderBy(customer => customer.Code)
            .Select(customer => new CustomerDto(customer.Id, customer.Code, customer.Name, customer.Address, customer.ContactPerson, customer.IsActive))
            .ToListAsync(cancellationToken);
    }

    public async Task<CustomerDto> CreateCustomerAsync(CreateCustomerRequest request, CancellationToken cancellationToken)
    {
        var customer = new Customer
        {
            Code = request.Code.Trim().ToUpperInvariant(),
            Name = request.Name.Trim(),
            Address = request.Address,
            ContactPerson = request.ContactPerson
        };

        await db.Customers.AddAsync(customer, cancellationToken);
        await eventPublisher.PublishAsync(new MasterDataUpdatedEvent(customer.Id, "Customer", "Created", customer.Code, customer.Name), cancellationToken);
        await db.SaveChangesAsync(cancellationToken);

        return new CustomerDto(customer.Id, customer.Code, customer.Name, customer.Address, customer.ContactPerson, customer.IsActive);
    }

    public async Task<IReadOnlyCollection<ProductDto>> ListProductsAsync(CancellationToken cancellationToken)
    {
        return await db.Products
            .AsNoTracking()
            .OrderBy(product => product.PartNumber)
            .Select(product => new ProductDto(product.Id, product.PartNumber, product.Description, product.Unit, product.MaterialSpec, product.IsActive))
            .ToListAsync(cancellationToken);
    }

    public async Task<ProductDto> CreateProductAsync(CreateProductRequest request, CancellationToken cancellationToken)
    {
        var product = new Product
        {
            PartNumber = request.PartNumber.Trim().ToUpperInvariant(),
            Description = request.Description.Trim(),
            Unit = string.IsNullOrWhiteSpace(request.Unit) ? "pcs" : request.Unit.Trim(),
            MaterialSpec = request.MaterialSpec
        };

        await db.Products.AddAsync(product, cancellationToken);
        await eventPublisher.PublishAsync(
            new MasterDataUpdatedEvent(product.Id, "Product", "Created", product.PartNumber, product.Description, product.Unit, product.MaterialSpec),
            cancellationToken);
        await db.SaveChangesAsync(cancellationToken);

        return new ProductDto(product.Id, product.PartNumber, product.Description, product.Unit, product.MaterialSpec, product.IsActive);
    }
}
