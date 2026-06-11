using Microsoft.EntityFrameworkCore;
using PJT_ERP.Shared.Infrastructure.Persistence;

namespace PJT_ERP.MasterData.Api.Infrastructure.Persistence;

public static class MasterDataSchemaInitializer
{
    public static async Task EnsureMasterDataSchemaAsync(this MasterDataContext db, CancellationToken cancellationToken = default)
    {
        await db.Database.EnsureCreatedAsync(cancellationToken);

        await db.Database.ExecuteSqlRawAsync(
            """
            ALTER TABLE customers ADD COLUMN IF NOT EXISTS email character varying(160);
            """,
            cancellationToken);

        await db.Database.ExecuteSeedSqlAsync(cancellationToken: cancellationToken);
    }
}
