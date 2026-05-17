using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Npgmq;

namespace PJT_HIMTIKA.Shared.Infrastructure.Messaging;

public sealed class PgmqEventReceiver(
    INpgmqClientWrapper client,
    IServiceScopeFactory scopeFactory,
    IOptions<EventBusOptions> options,
    ILogger<PgmqEventReceiver> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await client.CreateQueueAsync(options.Value.QueueName);
        await client.CreateQueueAsync(options.Value.DlqName);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                var message = await client.ReadAsync<string>(
                    options.Value.QueueName,
                    options.Value.VisibilityTimeoutSeconds);

                if (message is null)
                {
                    await Task.Delay(TimeSpan.FromSeconds(1), stoppingToken);
                    continue;
                }

                await ProcessMessageAsync(message, stoppingToken);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Error reading from PGMQ queue {QueueName}.", options.Value.QueueName);
                await Task.Delay(TimeSpan.FromSeconds(5), stoppingToken);
            }
        }
    }

    private async Task ProcessMessageAsync(NpgmqMessage<string> message, CancellationToken cancellationToken)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(message.Message))
            {
                await client.ArchiveAsync(options.Value.QueueName, message.MsgId);
                return;
            }

            using var document = JsonDocument.Parse(message.Message);
            var root = document.RootElement;

            if (!root.TryGetProperty("EventName", out var eventNameElement)
                || !root.TryGetProperty("Payload", out var payload)
                || eventNameElement.GetString() is not { } eventName)
            {
                await MoveToDlqAsync(message);
                return;
            }

            if (message.ReadCt > options.Value.RetryCount)
            {
                await MoveToDlqAsync(message);
                return;
            }

            using var scope = scopeFactory.CreateScope();
            var dispatcher = scope.ServiceProvider.GetRequiredService<EventDispatcher>();
            await dispatcher.DispatchAsync(eventName, payload, cancellationToken);
            await client.ArchiveAsync(options.Value.QueueName, message.MsgId);
        }
        catch (JsonException ex)
        {
            logger.LogError(ex, "Invalid PGMQ message JSON. Moving message {MessageId} to DLQ.", message.MsgId);
            await MoveToDlqAsync(message);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "PGMQ message {MessageId} failed and will become visible again.", message.MsgId);
        }
    }

    private async Task MoveToDlqAsync(NpgmqMessage<string> message)
    {
        await client.SendAsync(options.Value.DlqName, message.Message ?? "");
        await client.ArchiveAsync(options.Value.QueueName, message.MsgId);
    }
}
