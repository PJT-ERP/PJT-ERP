using Npgmq;

namespace PJT_HIMTIKA.Shared.Infrastructure.Messaging;

public sealed class NpgmqClientWrapper(NpgmqClient client) : INpgmqClientWrapper
{
    public Task CreateQueueAsync(string queueName)
    {
        return client.CreateQueueAsync(queueName);
    }

    public Task<long> SendAsync(string queueName, string message)
    {
        return client.SendAsync(queueName, message);
    }

    public Task<NpgmqMessage<T>?> ReadAsync<T>(string queueName, int visibilityTimeoutSeconds) where T : class
    {
        return client.ReadAsync<T>(queueName, visibilityTimeoutSeconds);
    }

    public Task ArchiveAsync(string queueName, long messageId)
    {
        return client.ArchiveAsync(queueName, messageId);
    }
}
