using Microsoft.EntityFrameworkCore;
using PJT_ERP.MasterData.Api.Domain.Entities;

namespace PJT_ERP.MasterData.Api.Infrastructure.Persistence;

public static class MasterDataSeeder
{
    public static async Task SeedAsync(MasterDataContext db, CancellationToken cancellationToken = default)
    {
        if (!await db.Customers.AnyAsync(cancellationToken))
        {
            db.Customers.AddRange(
                new Customer
                {
                    Code = "CUST-001",
                    Name = "PT Contoh Customer",
                    Address = "Jakarta",
                    ContactPerson = "Budi"
                },
                new Customer
                {
                    Code = "CUST-002",
                    Name = "PT Nusantara Teknik",
                    Address = "Bekasi",
                    ContactPerson = "Sari"
                },
                new Customer
                {
                    Code = "CUST-003",
                    Name = "PT Presisi Mandiri",
                    Address = "Tangerang",
                    ContactPerson = "Andi"
                });
        }

        if (!await db.Products.AnyAsync(cancellationToken))
        {
            db.Products.AddRange(
                new Product
                {
                    PartNumber = "PART-001",
                    Description = "Shaft Diameter 20mm",
                    Unit = "pcs",
                    MaterialSpec = "S45C"
                },
                new Product
                {
                    PartNumber = "PART-002",
                    Description = "Bracket Plate 8mm",
                    Unit = "pcs",
                    MaterialSpec = "SS400"
                },
                new Product
                {
                    PartNumber = "PART-003",
                    Description = "Bushing Bronze",
                    Unit = "pcs",
                    MaterialSpec = "BC6"
                });
        }

        await db.SaveChangesAsync(cancellationToken);
    }
}
