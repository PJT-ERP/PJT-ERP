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
        var code = string.IsNullOrWhiteSpace(request.Code)
            ? await GenerateSequentialCodeAsync("CUST-", db.Customers.Where(c => c.Code.StartsWith("CUST-")).Select(c => c.Code), cancellationToken)
            : request.Code.Trim().ToUpperInvariant();

        var customer = new Customer
        {
            Code = code,
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
            .Include(p => p.BomItems)
            .ThenInclude(b => b.InventoryItem)
            .OrderBy(product => product.PartNumber)
            .Select(product => new ProductDto(
                product.Id, 
                product.PartNumber, 
                product.Description, 
                product.Unit, 
                product.MaterialSpec, 
                product.IsActive, 
                product.BomItems.Select(b => new ProductBomItemDto(
                    b.Id,
                    b.InventoryItemId,
                    b.InventoryItem.Code,
                    b.InventoryItem.Name,
                    b.Quantity,
                    b.InventoryItem.Unit)).ToList(),
                product.CreatedAtUtc, 
                product.UpdatedAtUtc))
            .ToListAsync(cancellationToken);
    }

    public async Task<ProductDto> CreateProductAsync(CreateProductRequest request, CancellationToken cancellationToken)
    {
        var partNumber = string.IsNullOrWhiteSpace(request.PartNumber) 
            ? await GenerateSequentialCodeAsync("PRD-", db.Products.Where(p => p.PartNumber.StartsWith("PRD-")).Select(p => p.PartNumber), cancellationToken)
            : request.PartNumber.Trim().ToUpperInvariant();

        var product = new Product
        {
            PartNumber = partNumber,
            Description = request.Description?.Trim() ?? "",
            Unit = string.IsNullOrWhiteSpace(request.Unit) ? "pcs" : request.Unit.Trim(),
            MaterialSpec = request.MaterialSpec
        };

        if (request.BomItems != null)
        {
            foreach (var item in request.BomItems)
            {
                product.BomItems.Add(new ProductBomItem
                {
                    InventoryItemId = item.InventoryItemId,
                    Quantity = item.Quantity
                });
            }
        }

        await db.Products.AddAsync(product, cancellationToken);
        await eventPublisher.PublishAsync(
            new MasterDataUpdatedEvent(product.Id, "Product", "Created", product.PartNumber, product.Description, product.Unit, product.MaterialSpec),
            cancellationToken);
        await db.SaveChangesAsync(cancellationToken);

        // Load the navigation properties for the return DTO
        if (product.BomItems.Count > 0)
        {
            await db.Entry(product).Collection(p => p.BomItems).Query().Include(b => b.InventoryItem).LoadAsync(cancellationToken);
        }

        return new ProductDto(
            product.Id, 
            product.PartNumber, 
            product.Description, 
            product.Unit, 
            product.MaterialSpec, 
            product.IsActive, 
            product.BomItems.Select(b => new ProductBomItemDto(
                b.Id,
                b.InventoryItemId,
                b.InventoryItem.Code,
                b.InventoryItem.Name,
                b.Quantity,
                b.InventoryItem.Unit)).ToList(),
            product.CreatedAtUtc, 
            product.UpdatedAtUtc);
    }

    public async Task<ProductDto> UpdateProductAsync(Guid id, CreateProductRequest request, CancellationToken cancellationToken)
    {
        var product = await db.Products
            .FirstOrDefaultAsync(p => p.Id == id, cancellationToken);
            
        if (product == null)
        {
            throw new Exception("Product not found");
        }

        product.Description = request.Description?.Trim() ?? "";
        product.Unit = string.IsNullOrWhiteSpace(request.Unit) ? "pcs" : request.Unit.Trim();
        product.MaterialSpec = request.MaterialSpec;
        product.UpdatedAtUtc = DateTime.UtcNow;

        // Update BOM properly - Bypass change tracker for deletes to avoid double-delete/concurrency state issues
        await db.ProductBomItems.Where(b => b.ProductId == id).ExecuteDeleteAsync(cancellationToken);
        product.BomItems = new List<ProductBomItem>();

        if (request.BomItems != null)
        {
            foreach (var reqItem in request.BomItems)
            {
                var newItem = new ProductBomItem
                {
                    Id = Guid.NewGuid(),
                    ProductId = product.Id,
                    InventoryItemId = reqItem.InventoryItemId,
                    Quantity = reqItem.Quantity
                };
                db.ProductBomItems.Add(newItem);
                product.BomItems.Add(newItem);
            }
        }

        await eventPublisher.PublishAsync(
            new MasterDataUpdatedEvent(product.Id, "Product", "Updated", product.PartNumber, product.Description, product.Unit, product.MaterialSpec),
            cancellationToken);
            
        try
        {
            await db.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateConcurrencyException ex)
        {
            var messages = new List<string>();
            foreach (var entry in ex.Entries)
            {
                var entityType = entry.Entity.GetType().Name;
                var state = entry.State;
                var dbValues = await entry.GetDatabaseValuesAsync();
                
                string entityDetails = "N/A";
                if (entry.Entity is ProductBomItem pbi)
                {
                    entityDetails = $"Id={pbi.Id}, InvId={pbi.InventoryItemId}, Qty={pbi.Quantity}";
                }
                
                messages.Add($"Concurrency exception on {entityType} (State: {state}). Details: {entityDetails}. Database values exists: {dbValues != null}");
            }
            throw new Exception(string.Join(" | ", messages), ex);
        }

        // Load the navigation properties for the return DTO
        if (product.BomItems.Count > 0)
        {
            await db.Entry(product).Collection(p => p.BomItems).Query().Include(b => b.InventoryItem).LoadAsync(cancellationToken);
        }

        return new ProductDto(
            product.Id, 
            product.PartNumber, 
            product.Description, 
            product.Unit, 
            product.MaterialSpec, 
            product.IsActive, 
            product.BomItems.Select(b => new ProductBomItemDto(
                b.Id,
                b.InventoryItemId,
                b.InventoryItem.Code,
                b.InventoryItem.Name,
                b.Quantity,
                b.InventoryItem.Unit)).ToList(),
            product.CreatedAtUtc, 
            product.UpdatedAtUtc);
    }

    public async Task UpdateProductBomAsync(Guid id, UpdateProductBomRequest request, CancellationToken cancellationToken)
    {
        var product = await db.Products
            .FirstOrDefaultAsync(p => p.Id == id, cancellationToken);

        if (product is null) return;

        // Remove old items completely
        await db.ProductBomItems.Where(b => b.ProductId == id).ExecuteDeleteAsync(cancellationToken);
        product.BomItems = new List<ProductBomItem>();

        if (request.BomItems != null)
        {
            foreach (var item in request.BomItems)
            {
                // Explicitly add to DbSet instead of just collection to ensure it's tracked as Added
                var newItem = new ProductBomItem
                {
                    Id = Guid.NewGuid(),
                    ProductId = product.Id,
                    InventoryItemId = item.InventoryItemId,
                    Quantity = item.Quantity
                };
                db.ProductBomItems.Add(newItem);
                product.BomItems.Add(newItem);
            }
        }

        product.UpdatedAtUtc = DateTime.UtcNow;
        
        await eventPublisher.PublishAsync(
            new MasterDataUpdatedEvent(product.Id, "Product", "UpdatedBOM", product.PartNumber, product.Description),
            cancellationToken);
            
        await db.SaveChangesAsync(cancellationToken);
    }

    public async Task DeleteProductAsync(Guid id, CancellationToken cancellationToken)
    {
        var product = await db.Products.FirstOrDefaultAsync(p => p.Id == id, cancellationToken);
        if (product is null) return;

        db.Products.Remove(product);
        await eventPublisher.PublishAsync(
            new MasterDataUpdatedEvent(product.Id, "Product", "Deleted", product.PartNumber, product.Description),
            cancellationToken);
            
        await db.SaveChangesAsync(cancellationToken);
    }

    public async Task<IReadOnlyCollection<SupplierDto>> ListSuppliersAsync(CancellationToken cancellationToken)
    {
        return await db.Suppliers
            .AsNoTracking()
            .Include(s => s.Contacts)
            .AsSplitQuery()
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
        var code = string.IsNullOrWhiteSpace(request.Code)
            ? await GenerateSequentialCodeAsync("SUP-", db.Suppliers.Where(s => s.Code.StartsWith("SUP-")).Select(s => s.Code), cancellationToken)
            : request.Code.Trim().ToUpperInvariant();

        var supplier = new Supplier
        {
            Code = code,
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

        return ToSupplierDto(supplier);
    }

    public async Task<SupplierDto?> UpdateSupplierAsync(string code, UpdateSupplierRequest request, CancellationToken cancellationToken)
    {
        var normalizedCode = code.Trim().ToUpperInvariant();
        var supplier = await db.Suppliers
            // .Include(s => s.Contacts) // DO NOT INCLUDE to avoid EF tracking conflicts on update
            .FirstOrDefaultAsync(s => s.Code == normalizedCode, cancellationToken);

        if (supplier is null)
        {
            return null;
        }

        supplier.Name = request.Name.Trim();
        supplier.Type = request.Type.Trim();
        supplier.Category = request.Category.Trim();
        supplier.City = request.City;
        supplier.Province = request.Province;
        supplier.Address = request.Address;
        supplier.Status = string.IsNullOrWhiteSpace(request.Status) ? "Active" : request.Status.Trim();
        supplier.BankName = request.BankName;
        supplier.BankAccount = request.BankAccount;
        supplier.BankBranch = request.BankBranch;
        supplier.Npwp = request.Npwp;
        supplier.PaymentTerms = request.PaymentTerms;
        supplier.Since = request.Since;
        supplier.Rating = request.Rating;
        supplier.UpdatedAtUtc = DateTime.UtcNow;

        await db.SupplierContacts.Where(c => c.SupplierId == supplier.Id).ExecuteDeleteAsync(cancellationToken);

        foreach (var contact in request.Contacts ?? new List<CreateSupplierContactRequest>())
        {
            if (string.IsNullOrWhiteSpace(contact.Name))
            {
                continue;
            }

            var newContact = new SupplierContact
            {
                Id = Guid.NewGuid(),
                SupplierId = supplier.Id,
                Name = contact.Name.Trim(),
                Role = contact.Role,
                Phone = contact.Phone,
                Email = NormalizeEmail(contact.Email),
                IsPrimary = contact.IsPrimary
            };
            db.SupplierContacts.Add(newContact);
        }

        await eventPublisher.PublishAsync(
            new MasterDataUpdatedEvent(supplier.Id, "Supplier", "Updated", supplier.Code, supplier.Name),
            cancellationToken);
        await db.SaveChangesAsync(cancellationToken);

        return ToSupplierDto(supplier);
    }

    public async Task<bool> DeleteSupplierAsync(string code, CancellationToken cancellationToken)
    {
        var normalizedCode = code.Trim().ToUpperInvariant();
        var supplier = await db.Suppliers.FirstOrDefaultAsync(s => s.Code == normalizedCode, cancellationToken);
        if (supplier is null)
        {
            return false;
        }

        db.Suppliers.Remove(supplier);
        await eventPublisher.PublishAsync(
            new MasterDataUpdatedEvent(supplier.Id, "Supplier", "Deleted", supplier.Code, supplier.Name),
            cancellationToken);
        await db.SaveChangesAsync(cancellationToken);
        return true;
    }

    private static string? NormalizeEmail(string? email)
    {
        return string.IsNullOrWhiteSpace(email) ? null : email.Trim().ToLowerInvariant();
    }

    private static SupplierDto ToSupplierDto(Supplier supplier)
    {
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

    public async Task<CustomerDto?> GetCustomerAsync(Guid id, CancellationToken cancellationToken)
    {
        var customer = await db.Customers.AsNoTracking().FirstOrDefaultAsync(c => c.Id == id, cancellationToken);
        if (customer is null) return null;

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

    public async Task<ProductDto?> GetProductAsync(Guid id, CancellationToken cancellationToken)
    {
        var product = await db.Products
            .AsNoTracking()
            .Include(p => p.BomItems)
            .ThenInclude(b => b.InventoryItem)
            .FirstOrDefaultAsync(p => p.Id == id, cancellationToken);

        if (product is null) return null;

        return new ProductDto(
            product.Id, 
            product.PartNumber, 
            product.Description, 
            product.Unit, 
            product.MaterialSpec, 
            product.IsActive, 
            product.BomItems.Select(b => new ProductBomItemDto(
                b.Id,
                b.InventoryItemId,
                b.InventoryItem.Code,
                b.InventoryItem.Name,
                b.Quantity,
                b.InventoryItem.Unit)).ToList(),
            product.CreatedAtUtc, 
            product.UpdatedAtUtc);
    }

    private async Task<string> GenerateSequentialCodeAsync(string prefix, IQueryable<string> existingCodesQuery, CancellationToken cancellationToken)
    {
        var existingCodes = await existingCodesQuery.ToListAsync(cancellationToken);
        
        var max = 0;
        foreach (var code in existingCodes)
        {
            if (code.Length <= prefix.Length) continue;
            var numberStr = code[prefix.Length..];
            if (int.TryParse(numberStr, out var number) && number > max)
            {
                max = number;
            }
        }

        return $"{prefix}{(max + 1):000}";
    }

    public async Task<string> PreviewNextCustomerCodeAsync(CancellationToken cancellationToken)
    {
        return await GenerateSequentialCodeAsync("CUST-", db.Customers.Select(c => c.Code), cancellationToken);
    }

    public async Task<string> PreviewNextSupplierCodeAsync(CancellationToken cancellationToken)
    {
        return await GenerateSequentialCodeAsync("SUP-", db.Suppliers.Select(s => s.Code), cancellationToken);
    }
}
