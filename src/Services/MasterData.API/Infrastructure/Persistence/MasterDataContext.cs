using Microsoft.EntityFrameworkCore;
using PJT_ERP.MasterData.Api.Domain.Entities;
using PJT_ERP.Shared.Infrastructure.Abstractions;
using PJT_ERP.Shared.Infrastructure.Messaging;

namespace PJT_ERP.MasterData.Api.Infrastructure.Persistence;

public sealed class MasterDataContext(DbContextOptions<MasterDataContext> options) : DbContext(options), IUnitOfWork
{
    public DbSet<Customer> Customers => Set<Customer>();
    public DbSet<Product> Products => Set<Product>();
    public DbSet<Supplier> Suppliers => Set<Supplier>();
    public DbSet<SupplierContact> SupplierContacts => Set<SupplierContact>();
    public DbSet<InventoryItem> InventoryItems => Set<InventoryItem>();
    public DbSet<ProductBomItem> ProductBomItems => Set<ProductBomItem>();
    public DbSet<OutboxMessage> OutboxMessages => Set<OutboxMessage>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Customer>(builder =>
        {
            builder.ToTable("customers");
            builder.HasKey(customer => customer.Id);
            builder.HasIndex(customer => customer.Code).IsUnique();
            builder.Property(customer => customer.Code).HasMaxLength(40).HasColumnName("code");
            builder.Property(customer => customer.Name).HasMaxLength(160).HasColumnName("name");
            builder.Property(customer => customer.Address).HasMaxLength(400).HasColumnName("address");
            builder.Property(customer => customer.ContactPerson).HasMaxLength(120).HasColumnName("contact_person");
            builder.Property(customer => customer.Email).HasMaxLength(160).HasColumnName("email");
            builder.Property(customer => customer.Phone).HasMaxLength(40).HasColumnName("phone");
            builder.Property(customer => customer.IsActive).HasColumnName("is_active");
            builder.Property(customer => customer.CreatedAtUtc).HasColumnName("created_at_utc");
            builder.Property(customer => customer.UpdatedAtUtc).HasColumnName("updated_at_utc");
        });

        modelBuilder.Entity<Product>(builder =>
        {
            builder.ToTable("products");
            builder.HasKey(product => product.Id);
            builder.HasIndex(product => product.PartNumber).IsUnique();
            builder.Property(product => product.PartNumber).HasMaxLength(100).HasColumnName("part_number");
            builder.Property(product => product.Description).HasColumnName("description");
            builder.Property(product => product.Unit).HasMaxLength(24).HasColumnName("unit");
            builder.Property(product => product.MaterialSpec).HasMaxLength(255).HasColumnName("material_spec");
            builder.Property(product => product.IsActive).HasColumnName("is_active");
            builder.Property(product => product.CreatedAtUtc).HasColumnName("created_at_utc");
            builder.Property(product => product.UpdatedAtUtc).HasColumnName("updated_at_utc");
            
            builder.HasMany(p => p.BomItems)
                   .WithOne(b => b.Product)
                   .HasForeignKey(b => b.ProductId)
                   .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<ProductBomItem>(builder =>
        {
            builder.ToTable("product_bom_items");
            builder.HasKey(b => b.Id);
            builder.Property(b => b.ProductId).HasColumnName("product_id");
            builder.Property(b => b.InventoryItemId).HasColumnName("inventory_item_id");
            builder.Property(b => b.Quantity).HasColumnName("quantity");
            
            builder.HasOne(b => b.InventoryItem)
                   .WithMany()
                   .HasForeignKey(b => b.InventoryItemId)
                   .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<Supplier>(builder =>
        {
            builder.ToTable("suppliers");
            builder.HasKey(supplier => supplier.Id);
            builder.HasIndex(supplier => supplier.Code).IsUnique();
            builder.Property(supplier => supplier.Code).HasMaxLength(40).HasColumnName("code");
            builder.Property(supplier => supplier.Name).HasMaxLength(160).HasColumnName("name");
            builder.Property(supplier => supplier.Type).HasMaxLength(40).HasColumnName("type");
            builder.Property(supplier => supplier.Category).HasMaxLength(120).HasColumnName("category");
            builder.Property(supplier => supplier.City).HasMaxLength(120).HasColumnName("city");
            builder.Property(supplier => supplier.Province).HasMaxLength(120).HasColumnName("province");
            builder.Property(supplier => supplier.Address).HasMaxLength(400).HasColumnName("address");
            builder.Property(supplier => supplier.Status).HasMaxLength(40).HasColumnName("status");
            builder.Property(supplier => supplier.BankName).HasMaxLength(120).HasColumnName("bank_name");
            builder.Property(supplier => supplier.BankAccount).HasMaxLength(80).HasColumnName("bank_account");
            builder.Property(supplier => supplier.BankBranch).HasMaxLength(120).HasColumnName("bank_branch");
            builder.Property(supplier => supplier.Npwp).HasMaxLength(80).HasColumnName("npwp");
            builder.Property(supplier => supplier.PaymentTerms).HasMaxLength(80).HasColumnName("payment_terms");
            builder.Property(supplier => supplier.Since).HasMaxLength(40).HasColumnName("since");
            builder.Property(supplier => supplier.Rating).HasColumnName("rating");
            builder.Property(supplier => supplier.CreatedAtUtc).HasColumnName("created_at_utc");
            builder.Property(supplier => supplier.UpdatedAtUtc).HasColumnName("updated_at_utc");

            builder.HasMany(s => s.Contacts)
                   .WithOne(c => c.Supplier)
                   .HasForeignKey(c => c.SupplierId)
                   .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<SupplierContact>(builder =>
        {
            builder.ToTable("supplier_contacts");
            builder.HasKey(contact => contact.Id);
            builder.Property(contact => contact.SupplierId).HasColumnName("supplier_id");
            builder.Property(contact => contact.Name).HasMaxLength(120).HasColumnName("name");
            builder.Property(contact => contact.Role).HasMaxLength(120).HasColumnName("role");
            builder.Property(contact => contact.Phone).HasMaxLength(40).HasColumnName("phone");
            builder.Property(contact => contact.Email).HasMaxLength(160).HasColumnName("email");
            builder.Property(contact => contact.IsPrimary).HasColumnName("is_primary");
        });

        modelBuilder.Entity<InventoryItem>(b =>
        {
            b.ToTable("inventory_items");
            b.HasKey(x => x.Id);
            b.HasIndex(x => x.Code).IsUnique();
            b.Property(x => x.Code).HasColumnName("code").IsRequired().HasMaxLength(80);
            b.Property(x => x.Name).HasColumnName("name").IsRequired().HasMaxLength(160);
            b.Property(x => x.Category).HasColumnName("category").HasMaxLength(80);
            b.Property(x => x.Unit).HasColumnName("unit").HasMaxLength(40);
            b.Property(x => x.CurrentStock).HasColumnName("current_stock");
            b.Property(x => x.MinStock).HasColumnName("min_stock");
            b.Property(x => x.MaxStock).HasColumnName("max_stock");
            b.Property(x => x.ReorderPoint).HasColumnName("reorder_point");
            b.Property(x => x.Location).HasColumnName("location").HasMaxLength(120);
            b.Property(x => x.SupplierName).HasColumnName("supplier_name").HasMaxLength(160);
            b.Property(x => x.UnitPrice).HasColumnName("unit_price");
            b.Property(x => x.CreatedAtUtc).HasColumnName("created_at_utc");
            b.Property(x => x.UpdatedAtUtc).HasColumnName("updated_at_utc");
        });

        modelBuilder.ApplyConfiguration(new OutboxMessageConfiguration());
    }
}
