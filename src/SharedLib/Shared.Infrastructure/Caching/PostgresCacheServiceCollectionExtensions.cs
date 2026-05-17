using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace PJT_ERP.Shared.Infrastructure.Caching;

public static class PostgresCacheServiceCollectionExtensions
{
    public static IServiceCollection AddPjtPostgresCache(this IServiceCollection services, IConfiguration configuration)
    {
        services.Configure<PostgresCacheOptions>(options =>
        {
            options.ConnectionString = configuration.GetConnectionString("CacheConnection")
                ?? configuration.GetConnectionString("DefaultConnection")
                ?? throw new InvalidOperationException("ConnectionStrings:CacheConnection is required for distributed caching.");
            configuration.GetSection("PostgresCache").Bind(options);
        });

        services.AddSingleton<IDistributedCache, PostgresDistributedCache>();
        return services;
    }
}
