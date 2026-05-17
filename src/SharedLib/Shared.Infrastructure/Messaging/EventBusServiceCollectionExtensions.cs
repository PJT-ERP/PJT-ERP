using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Npgmq;
using Npgsql;

namespace PJT_HIMTIKA.Shared.Infrastructure.Messaging;

public static class EventBusServiceCollectionExtensions
{
    public static EventBusBuilder AddPgmqEventBus<TContext>(
        this IServiceCollection services,
        IConfiguration configuration,
        Action<EventBusOptions>? configure = null)
        where TContext : DbContext
    {
        services.Configure<EventBusOptions>(configuration.GetSection("EventBus"));
        if (configure is not null)
        {
            services.PostConfigure(configure);
        }

        services.Configure<EventBusSubscriptionInfo>(_ => { });
        services.AddScoped<EventDispatcher>();
        services.AddScoped<IEventPublisher, OutboxEventPublisher<TContext>>();
        services.AddHostedService<PgmqOutboxProcessor<TContext>>();
        services.AddSingleton<NpgmqClient>(provider =>
        {
            var connectionString = configuration.GetConnectionString("NpgmqConnection")
                ?? configuration.GetConnectionString("DefaultConnection")
                ?? throw new InvalidOperationException("ConnectionStrings:NpgmqConnection is required for PGMQ.");

            var logger = provider.GetRequiredService<ILogger<NpgmqClient>>();
            var client = new NpgmqClient(connectionString);

            try
            {
                client.InitAsync().GetAwaiter().GetResult();
            }
            catch (Exception ex) when (IsIgnorablePgmqInitException(ex, out var postgresException))
            {
                logger.LogWarning(
                    ex,
                    "PGMQ initialization returned PostgreSQL state {SqlState}; continuing.",
                    postgresException.SqlState);
            }

            return client;
        });
        services.AddSingleton<INpgmqClientWrapper, NpgmqClientWrapper>();
        services.AddSingleton<PgmqPublisher>();

        return new EventBusBuilder(services);
    }

    private static bool IsIgnorablePgmqInitException(Exception exception, out PostgresException postgresException)
    {
        postgresException = null!;

        for (var current = exception; current is not null; current = current.InnerException)
        {
            if (current is not PostgresException candidate)
            {
                continue;
            }

            if (candidate.SqlState is PostgresErrorCodes.UniqueViolation
                or PostgresErrorCodes.DuplicateTable
                or PostgresErrorCodes.DuplicateObject)
            {
                postgresException = candidate;
                return true;
            }
        }

        return false;
    }
}
