using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;

namespace PJT_ERP.Shared.Infrastructure.Persistence;

public static class SqlSeedRunner
{
    public static async Task ExecuteSeedSqlAsync(
        this DatabaseFacade database,
        string fileName = "SeedData.sql",
        CancellationToken cancellationToken = default)
    {
        var path = Path.Combine(AppContext.BaseDirectory, fileName);
        if (!File.Exists(path))
        {
            return;
        }

        var sql = await File.ReadAllTextAsync(path, cancellationToken);
        if (string.IsNullOrWhiteSpace(sql))
        {
            return;
        }

        await database.ExecuteSqlRawAsync(sql, cancellationToken);
    }
}
