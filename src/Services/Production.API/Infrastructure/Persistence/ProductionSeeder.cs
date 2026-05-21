using Microsoft.EntityFrameworkCore;
using PJT_ERP.Production.Api.Domain.Entities;

namespace PJT_ERP.Production.Api.Infrastructure.Persistence;

public static class ProductionSeeder
{
    public static async Task SeedAsync(ProductionContext db, CancellationToken cancellationToken = default)
    {
        var now = DateTime.UtcNow;

        if (!await db.CustomerReplicas.AnyAsync(customer => customer.Code == "CUST-001", cancellationToken))
        {
            db.CustomerReplicas.Add(new CustomerReplica
            {
                Id = Guid.Parse("10000000-0000-0000-0000-000000000001"),
                Code = "CUST-001",
                Name = "PT Contoh Customer",
                UpdatedAtUtc = now
            });
        }

        if (!await db.ProductReplicas.AnyAsync(product => product.PartNumber == "PART-001", cancellationToken))
        {
            db.ProductReplicas.Add(new ProductReplica
            {
                Id = Guid.Parse("20000000-0000-0000-0000-000000000001"),
                PartNumber = "PART-001",
                Description = "Shaft Diameter 20mm",
                Unit = "pcs",
                MaterialSpec = "S45C",
                UpdatedAtUtc = now
            });
        }

        await db.SaveChangesAsync(cancellationToken);

        if (!await db.SalesOrders.AnyAsync(order => order.SoNumber == "SO-DEV-001", cancellationToken))
        {
            var customer = await db.CustomerReplicas
                .AsNoTracking()
                .FirstAsync(customer => customer.Code == "CUST-001", cancellationToken);
            var product = await db.ProductReplicas
                .AsNoTracking()
                .FirstAsync(product => product.PartNumber == "PART-001", cancellationToken);

            db.SalesOrders.Add(new SalesOrder
            {
                Id = Guid.Parse("30000000-0000-0000-0000-000000000001"),
                SoNumber = "SO-DEV-001",
                CustomerId = customer.Id,
                CustomerCode = customer.Code,
                CustomerName = customer.Name,
                SoDate = DateOnly.FromDateTime(now),
                TargetDate = DateOnly.FromDateTime(now.AddDays(14)),
                Status = SalesOrderStatuses.Confirmed,
                CreatedAtUtc = now,
                UpdatedAtUtc = now,
                Items =
                [
                    new SalesOrderItem
                    {
                        Id = Guid.Parse("40000000-0000-0000-0000-000000000001"),
                        ProductId = product.Id,
                        ProductPartNumber = product.PartNumber,
                        ProductDescription = product.Description,
                        ProductMaterialSpec = product.MaterialSpec,
                        Qty = 10,
                        Notes = "Development seed order",
                        CreatedAtUtc = now,
                        UpdatedAtUtc = now
                    }
                ]
            });

            await db.SaveChangesAsync(cancellationToken);
        }

        if (!await db.ProductionOrders.AnyAsync(order => order.PoNumber == "PO-DEV-001", cancellationToken))
        {
            var salesOrderItem = await db.SalesOrderItems
                .AsNoTracking()
                .FirstAsync(item => item.ProductPartNumber == "PART-001", cancellationToken);

            db.ProductionOrders.Add(new ProductionOrder
            {
                Id = Guid.Parse("50000000-0000-0000-0000-000000000001"),
                PoNumber = "PO-DEV-001",
                SalesOrderItemId = salesOrderItem.Id,
                DrawingRef = "DRW-DEV-001",
                BarcodeUid = "BARCODE-DEV-001",
                OrderQty = 10,
                Status = ProductionOrderStatuses.Waiting,
                CreatedAtUtc = now,
                UpdatedAtUtc = now
            });

            await db.SaveChangesAsync(cancellationToken);
        }
    }
}
