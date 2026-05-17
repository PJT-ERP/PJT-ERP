using Npgmq;

namespace PJT_ERP.Shared.Infrastructure.Messaging;

public interface INpgmqClientWrapper
{
    Task CreateQueueAsync(string queueName);
    Task<long> SendAsync(string queueName, string message);
    Task<NpgmqMessage<T>?> ReadAsync<T>(string queueName, int visibilityTimeoutSeconds) where T : class;
    Task ArchiveAsync(string queueName, long messageId);
}
