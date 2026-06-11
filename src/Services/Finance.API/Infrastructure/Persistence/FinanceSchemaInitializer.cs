using Microsoft.EntityFrameworkCore;
using PJT_ERP.Shared.Infrastructure.Persistence;

namespace PJT_ERP.Finance.Api.Infrastructure.Persistence;

public static class FinanceSchemaInitializer
{
    public static async Task EnsureFinanceSchemaAsync(this FinanceContext db, CancellationToken cancellationToken = default)
    {
        await db.Database.EnsureCreatedAsync(cancellationToken);

        await db.Database.ExecuteSeedSqlAsync(cancellationToken: cancellationToken);
    }
}
