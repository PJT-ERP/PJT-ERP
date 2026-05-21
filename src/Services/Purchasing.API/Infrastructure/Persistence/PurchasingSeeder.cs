using Microsoft.EntityFrameworkCore;
using PJT_ERP.Purchasing.Api.Domain.Entities;

namespace PJT_ERP.Purchasing.Api.Infrastructure.Persistence;

public static class PurchasingSeeder
{
    public static async Task SeedAsync(PurchasingContext db, CancellationToken cancellationToken = default)
    {
        var now = DateTime.UtcNow;
        var salesOrderId = Guid.Parse("30000000-0000-0000-0000-000000000001");
        var productionOrderId = Guid.Parse("50000000-0000-0000-0000-000000000001");

        if (!await db.SalesOrderSnapshots.AnyAsync(order => order.SalesOrderId == salesOrderId, cancellationToken))
        {
            db.SalesOrderSnapshots.Add(new SalesOrderSnapshot
            {
                SalesOrderId = salesOrderId,
                SalesOrderNumber = "SO-DEV-001",
                CustomerId = Guid.Parse("10000000-0000-0000-0000-000000000001"),
                ConfirmedAtUtc = now,
                CreatedAtUtc = now,
                UpdatedAtUtc = now
            });
        }

        if (!await db.MaterialRequirements.AnyAsync(requirement => requirement.ProductionOrderId == productionOrderId, cancellationToken))
        {
            db.MaterialRequirements.Add(new MaterialRequirement
            {
                Id = Guid.Parse("70000000-0000-0000-0000-000000000001"),
                SalesOrderId = salesOrderId,
                SalesOrderNumber = "SO-DEV-001",
                ProductionOrderId = productionOrderId,
                SpkNumber = "PO-DEV-001",
                BarcodeUid = "BARCODE-DEV-001",
                ProductId = Guid.Parse("20000000-0000-0000-0000-000000000001"),
                ProductPartNumber = "PART-001",
                ProductDescription = "Shaft Diameter 20mm",
                MaterialSpec = "S45C",
                RequiredQty = 10,
                ProjectName = "Development Seed Project",
                Status = MaterialRequirementStatuses.Required,
                CreatedAtUtc = now,
                UpdatedAtUtc = now
            });
        }

        await db.SaveChangesAsync(cancellationToken);

        if (await db.PurchaseRequests.AnyAsync(request => request.PrNumber == "PR-DEV-001", cancellationToken))
        {
            return;
        }

        var materialRequirement = await db.MaterialRequirements
            .AsNoTracking()
            .FirstAsync(requirement => requirement.ProductionOrderId == productionOrderId, cancellationToken);

        db.PurchaseRequests.Add(new PurchaseRequest
        {
            Id = Guid.Parse("80000000-0000-0000-0000-000000000001"),
            PrNumber = "PR-DEV-001",
            RequestDate = DateOnly.FromDateTime(now),
            RequestedByUserId = Guid.Parse("90000000-0000-0000-0000-000000000001"),
            RequesterName = "Development User",
            SalesOrderId = salesOrderId,
            SalesOrderNumber = "SO-DEV-001",
            ProjectName = "Development Seed Project",
            Status = PurchaseRequestStatuses.Submitted,
            CreatedAtUtc = now,
            UpdatedAtUtc = now,
            Items =
            [
                new PurchaseRequestItem
                {
                    MaterialRequirementId = materialRequirement.Id,
                    SalesOrderId = salesOrderId,
                    SalesOrderNumber = "SO-DEV-001",
                    ProductionOrderId = productionOrderId,
                    SpkNumber = "PO-DEV-001",
                    ProjectName = "Development Seed Project",
                    ItemName = "S45C Round Bar",
                    Size = "Dia 25mm x 1000mm",
                    Qty = 10,
                    SuggestedSupplier = "PT Supplier Contoh",
                    PurchaseStatus = PurchaseItemStatuses.Requested,
                    Notes = "Development seed purchase item",
                    CreatedAtUtc = now,
                    UpdatedAtUtc = now
                }
            ]
        });

        await db.SaveChangesAsync(cancellationToken);
    }
}
