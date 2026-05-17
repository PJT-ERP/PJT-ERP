using System.Collections.Concurrent;
using Microsoft.Extensions.Options;

namespace PJT_HIMTIKA.Shared.Infrastructure.Messaging;

public sealed class PgmqPublisher(INpgmqClientWrapper client, IOptions<EventBusOptions> options)
{
    private readonly ConcurrentDictionary<string, byte> _knownQueues = new();
    private readonly SemaphoreSlim _queueLock = new(1, 1);

    public async Task PublishAsync(string message)
    {
        var targetQueues = options.Value.FanOutQueues.Count == 0
            ? [options.Value.QueueName]
            : options.Value.FanOutQueues;

        foreach (var queue in targetQueues.Distinct(StringComparer.Ordinal))
        {
            await EnsureQueueAsync(queue);
            await client.SendAsync(queue, message);
        }
    }

    private async Task EnsureQueueAsync(string queueName)
    {
        if (_knownQueues.ContainsKey(queueName))
        {
            return;
        }

        await _queueLock.WaitAsync();
        try
        {
            if (_knownQueues.ContainsKey(queueName))
            {
                return;
            }

            await client.CreateQueueAsync(queueName);
            _knownQueues.TryAdd(queueName, 0);
        }
        finally
        {
            _queueLock.Release();
        }
    }
}
