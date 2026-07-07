using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace PJT_ERP.Shared.Infrastructure.Messaging;

public sealed class PgmqOutboxProcessor<TContext>(
    IServiceScopeFactory scopeFactory,
    ILogger<PgmqOutboxProcessor<TContext>> logger) : BackgroundService
    where TContext : DbContext
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                var count = await ProcessBatchAsync(stoppingToken);
                if (count == 0)
                {
                    await Task.Delay(TimeSpan.FromSeconds(1), stoppingToken);
                }
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "PGMQ outbox processor failed. Retrying soon.");
                await Task.Delay(TimeSpan.FromSeconds(5), stoppingToken);
            }
        }
    }

    private async Task<int> ProcessBatchAsync(CancellationToken cancellationToken)
    {
        using var scope = scopeFactory.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<TContext>();
        var publisher = scope.ServiceProvider.GetRequiredService<PgmqPublisher>();

        var messages = await dbContext.Set<OutboxMessage>()
            .Where(message => message.ProcessedAtUtc == null)
            .OrderBy(message => message.OccurredAtUtc)
            .Take(25)
            .ToListAsync(cancellationToken);

        foreach (var message in messages)
        {
            try
            {
                using var payload = JsonDocument.Parse(message.Content);
                var envelope = new
                {
                    EventName = message.Type,
                    Payload = payload.RootElement.Clone()
                };

                await publisher.PublishAsync(JsonSerializer.Serialize(envelope));
                message.MarkProcessed(DateTime.UtcNow);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Failed publishing outbox message {MessageId}.", message.Id);
                message.MarkFailed(ex.Message);
            }
        }

        if (messages.Count > 0)
        {
            await dbContext.SaveChangesAsync(cancellationToken);
        }
        
        return messages.Count;
    }
}
