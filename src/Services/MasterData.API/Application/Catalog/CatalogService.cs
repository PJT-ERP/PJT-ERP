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
            .Select(customer => new CustomerDto(
                customer.Id,
                customer.Code,
                customer.Name,
                customer.Address,
                customer.ContactPerson,
                customer.Email,
                customer.Phone,
                customer.IsActive))
            .ToListAsync(cancellationToken);
    }

    public async Task<CustomerDto> CreateCustomerAsync(CreateCustomerRequest request, CancellationToken cancellationToken)
    {
        var customer = new Customer
        {
            Code = request.Code.Trim().ToUpperInvariant(),
            Name = request.Name.Trim(),
            Address = request.Address,
            ContactPerson = request.ContactPerson,
            Email = NormalizeEmail(request.Email),
            Phone = request.Phone
        };

        await db.Customers.AddAsync(customer, cancellationToken);
        await eventPublisher.PublishAsync(
            new MasterDataUpdatedEvent(
                customer.Id,
                "Customer",
                "Created",
                customer.Code,
                customer.Name,
                Email: customer.Email),
            cancellationToken);
        await db.SaveChangesAsync(cancellationToken);

        return new CustomerDto(
            customer.Id,
            customer.Code,
            customer.Name,
            customer.Address,
            customer.ContactPerson,
            customer.Email,
            customer.Phone,
            customer.IsActive);
    }

    public async Task<CustomerDto?> UpdateCustomerAsync(string code, UpdateCustomerRequest request, CancellationToken cancellationToken)
    {
        var customer = await db.Customers.FirstOrDefaultAsync(c => c.Code == code, cancellationToken);
        if (customer is null) return null;

        customer.Name = request.Name.Trim();
        customer.Address = request.Address;
        customer.ContactPerson = request.ContactPerson;
        customer.Email = NormalizeEmail(request.Email);
        customer.Phone = request.Phone;
        customer.IsActive = request.IsActive;
        customer.UpdatedAtUtc = DateTime.UtcNow;

        await eventPublisher.PublishAsync(
            new MasterDataUpdatedEvent(
                customer.Id,
                "Customer",
                "Updated",
                customer.Code,
                customer.Name,
                Email: customer.Email),
            cancellationToken);
        await db.SaveChangesAsync(cancellationToken);

        return new CustomerDto(
            customer.Id,
            customer.Code,
            customer.Name,
            customer.Address,
            customer.ContactPerson,
            customer.Email,
            customer.Phone,
            customer.IsActive);
    }

    public async Task<bool> DeleteCustomerAsync(string code, CancellationToken cancellationToken)
    {
        var customer = await db.Customers.FirstOrDefaultAsync(c => c.Code == code, cancellationToken);
        if (customer is null) return false;

        db.Customers.Remove(customer);
        await eventPublisher.PublishAsync(
            new MasterDataUpdatedEvent(
                customer.Id,
                "Customer",
                "Deleted",
                customer.Code,
                customer.Name),
            cancellationToken);
        await db.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<IReadOnlyCollection<ProductDto>> ListProductsAsync(CancellationToken cancellationToken)
    {
        return await db.Products
            .AsNoTracking()
            .OrderBy(product => product.PartNumber)
            .Select(product => new ProductDto(product.Id, product.PartNumber, product.Description, product.Unit, product.MaterialSpec, product.IsActive, product.CreatedAtUtc, product.UpdatedAtUtc))
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

        return new ProductDto(product.Id, product.PartNumber, product.Description, product.Unit, product.MaterialSpec, product.IsActive, product.CreatedAtUtc, product.UpdatedAtUtc);
    }

    public async Task<IReadOnlyCollection<SupplierDto>> ListSuppliersAsync(CancellationToken cancellationToken)
    {
        return await db.Suppliers
            .AsNoTracking()
            .Include(s => s.Contacts)
            .OrderBy(s => s.Code)
            .Select(s => new SupplierDto(
                s.Id,
                s.Code,
                s.Name,
                s.Type,
                s.Category,
                s.City,
                s.Province,
                s.Address,
                s.Status,
                s.BankName,
                s.BankAccount,
                s.BankBranch,
                s.Npwp,
                s.PaymentTerms,
                s.Since,
                s.Rating,
                s.Contacts.Select(c => new SupplierContactDto(
                    c.Id,
                    c.Name,
                    c.Role,
                    c.Phone,
                    c.Email,
                    c.IsPrimary
                )).ToList(),
                s.CreatedAtUtc,
                s.UpdatedAtUtc
            ))
            .ToListAsync(cancellationToken);
    }

    public async Task<SupplierDto> CreateSupplierAsync(CreateSupplierRequest request, CancellationToken cancellationToken)
    {
        var supplier = new Supplier
        {
            Code = request.Code.Trim().ToUpperInvariant(),
            Name = request.Name.Trim(),
            Type = request.Type.Trim(),
            Category = request.Category.Trim(),
            City = request.City,
            Province = request.Province,
            Address = request.Address,
            Status = string.IsNullOrWhiteSpace(request.Status) ? "Active" : request.Status.Trim(),
            BankName = request.BankName,
            BankAccount = request.BankAccount,
            BankBranch = request.BankBranch,
            Npwp = request.Npwp,
            PaymentTerms = request.PaymentTerms,
            Since = request.Since,
            Rating = request.Rating,
            Contacts = request.Contacts?.Select(c => new SupplierContact
            {
                Name = c.Name.Trim(),
                Role = c.Role,
                Phone = c.Phone,
                Email = NormalizeEmail(c.Email),
                IsPrimary = c.IsPrimary
            }).ToList() ?? new List<SupplierContact>()
        };

        await db.Suppliers.AddAsync(supplier, cancellationToken);
        await eventPublisher.PublishAsync(
            new MasterDataUpdatedEvent(supplier.Id, "Supplier", "Created", supplier.Code, supplier.Name),
            cancellationToken);
        await db.SaveChangesAsync(cancellationToken);

        return new SupplierDto(
            supplier.Id,
            supplier.Code,
            supplier.Name,
            supplier.Type,
            supplier.Category,
            supplier.City,
            supplier.Province,
            supplier.Address,
            supplier.Status,
            supplier.BankName,
            supplier.BankAccount,
            supplier.BankBranch,
            supplier.Npwp,
            supplier.PaymentTerms,
            supplier.Since,
            supplier.Rating,
            supplier.Contacts.Select(c => new SupplierContactDto(
                c.Id, c.Name, c.Role, c.Phone, c.Email, c.IsPrimary
            )).ToList(),
            supplier.CreatedAtUtc,
            supplier.UpdatedAtUtc
        );
    }

    private static string? NormalizeEmail(string? email)
    {
        return string.IsNullOrWhiteSpace(email) ? null : email.Trim().ToLowerInvariant();
    }
}
