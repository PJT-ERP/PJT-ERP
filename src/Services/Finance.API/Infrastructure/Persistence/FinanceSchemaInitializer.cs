using Microsoft.EntityFrameworkCore;
using PJT_ERP.Shared.Infrastructure.Persistence;

namespace PJT_ERP.Finance.Api.Infrastructure.Persistence;

public static class FinanceSchemaInitializer
{
    public static async Task EnsureFinanceSchemaAsync(this FinanceContext db, CancellationToken cancellationToken = default)
    {
        await db.Database.EnsureCreatedAsync(cancellationToken);

        await db.Database.ExecuteSqlRawAsync(
            "ALTER TABLE invoice_candidate_items ADD COLUMN IF NOT EXISTS unit_price numeric(18,2) NOT NULL DEFAULT 0;",
            cancellationToken);

        await db.Database.ExecuteSeedSqlAsync(cancellationToken: cancellationToken);
    }
}
