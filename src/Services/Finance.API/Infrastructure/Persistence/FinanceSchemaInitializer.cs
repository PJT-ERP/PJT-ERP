using Microsoft.EntityFrameworkCore;

namespace PJT_ERP.Finance.Api.Infrastructure.Persistence;

public static class FinanceSchemaInitializer
{
    public static async Task EnsureFinanceSchemaAsync(this FinanceContext db, CancellationToken cancellationToken = default)
    {
        await db.Database.EnsureCreatedAsync(cancellationToken);
    }
}
