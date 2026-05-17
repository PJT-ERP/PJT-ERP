using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Options;
using Npgsql;

namespace PJT_ERP.Shared.Infrastructure.Caching;

public sealed class PostgresDistributedCache(IOptions<PostgresCacheOptions> options) : IDistributedCache
{
    private string QualifiedTableName => $"\"{options.Value.SchemaName}\".\"{options.Value.TableName}\"";

    public byte[]? Get(string key)
    {
        return GetAsync(key).GetAwaiter().GetResult();
    }

    public async Task<byte[]?> GetAsync(string key, CancellationToken token = default)
    {
        await EnsureTableAsync(token);
        await using var connection = new NpgsqlConnection(options.Value.ConnectionString);
        await connection.OpenAsync(token);

        await using var command = connection.CreateCommand();
        command.CommandText = $"""
            SELECT value, sliding_expiration_seconds, absolute_expiration_utc
            FROM {QualifiedTableName}
            WHERE id = @id AND (expires_at_utc IS NULL OR expires_at_utc > now());
            """;
        command.Parameters.AddWithValue("id", key);

        await using var reader = await command.ExecuteReaderAsync(token);
        if (!await reader.ReadAsync(token))
        {
            return null;
        }

        var value = (byte[])reader["value"];
        int? slidingSeconds = reader.IsDBNull(1) ? null : reader.GetInt32(1);
        DateTime? absoluteExpiration = reader.IsDBNull(2) ? null : reader.GetDateTime(2);
        await reader.CloseAsync();

        if (slidingSeconds.HasValue)
        {
            await RefreshInternalAsync(connection, key, TimeSpan.FromSeconds(slidingSeconds.Value), absoluteExpiration, token);
        }

        return value;
    }

    public void Set(string key, byte[] value, DistributedCacheEntryOptions entryOptions)
    {
        SetAsync(key, value, entryOptions).GetAwaiter().GetResult();
    }

    public async Task SetAsync(string key, byte[] value, DistributedCacheEntryOptions entryOptions, CancellationToken token = default)
    {
        await EnsureTableAsync(token);
        var now = DateTime.UtcNow;
        var absoluteExpiration = entryOptions.AbsoluteExpiration?.UtcDateTime
            ?? (entryOptions.AbsoluteExpirationRelativeToNow.HasValue
                ? now.Add(entryOptions.AbsoluteExpirationRelativeToNow.Value)
                : null as DateTime?);
        var slidingExpiration = entryOptions.SlidingExpiration;
        var expiresAt = ResolveExpiration(now, absoluteExpiration, slidingExpiration);

        await using var connection = new NpgsqlConnection(options.Value.ConnectionString);
        await connection.OpenAsync(token);
        await using var command = connection.CreateCommand();
        command.CommandText = $"""
            INSERT INTO {QualifiedTableName}
                (id, value, expires_at_utc, sliding_expiration_seconds, absolute_expiration_utc)
            VALUES
                (@id, @value, @expiresAt, @slidingSeconds, @absoluteExpiration)
            ON CONFLICT (id)
            DO UPDATE SET
                value = EXCLUDED.value,
                expires_at_utc = EXCLUDED.expires_at_utc,
                sliding_expiration_seconds = EXCLUDED.sliding_expiration_seconds,
                absolute_expiration_utc = EXCLUDED.absolute_expiration_utc;
            """;
        command.Parameters.AddWithValue("id", key);
        command.Parameters.AddWithValue("value", value);
        command.Parameters.AddWithValue("expiresAt", (object?)expiresAt ?? DBNull.Value);
        command.Parameters.AddWithValue("slidingSeconds", slidingExpiration.HasValue ? Convert.ToInt32(slidingExpiration.Value.TotalSeconds) : DBNull.Value);
        command.Parameters.AddWithValue("absoluteExpiration", (object?)absoluteExpiration ?? DBNull.Value);
        await command.ExecuteNonQueryAsync(token);
    }

    public void Refresh(string key)
    {
        RefreshAsync(key).GetAwaiter().GetResult();
    }

    public async Task RefreshAsync(string key, CancellationToken token = default)
    {
        await EnsureTableAsync(token);
        await using var connection = new NpgsqlConnection(options.Value.ConnectionString);
        await connection.OpenAsync(token);

        await using var command = connection.CreateCommand();
        command.CommandText = $"""
            SELECT sliding_expiration_seconds, absolute_expiration_utc
            FROM {QualifiedTableName}
            WHERE id = @id AND sliding_expiration_seconds IS NOT NULL;
            """;
        command.Parameters.AddWithValue("id", key);

        await using var reader = await command.ExecuteReaderAsync(token);
        if (!await reader.ReadAsync(token))
        {
            return;
        }

        var slidingSeconds = reader.GetInt32(0);
        DateTime? absoluteExpiration = reader.IsDBNull(1) ? null : reader.GetDateTime(1);
        await reader.CloseAsync();

        await RefreshInternalAsync(connection, key, TimeSpan.FromSeconds(slidingSeconds), absoluteExpiration, token);
    }

    public void Remove(string key)
    {
        RemoveAsync(key).GetAwaiter().GetResult();
    }

    public async Task RemoveAsync(string key, CancellationToken token = default)
    {
        await EnsureTableAsync(token);
        await using var connection = new NpgsqlConnection(options.Value.ConnectionString);
        await connection.OpenAsync(token);
        await using var command = connection.CreateCommand();
        command.CommandText = $"DELETE FROM {QualifiedTableName} WHERE id = @id;";
        command.Parameters.AddWithValue("id", key);
        await command.ExecuteNonQueryAsync(token);
    }

    private static DateTime? ResolveExpiration(DateTime now, DateTime? absoluteExpiration, TimeSpan? slidingExpiration)
    {
        var slidingExpiresAt = slidingExpiration.HasValue ? now.Add(slidingExpiration.Value) : null as DateTime?;

        return (absoluteExpiration, slidingExpiresAt) switch
        {
            (null, null) => null,
            (DateTime absolute, null) => absolute,
            (null, DateTime sliding) => sliding,
            (DateTime absolute, DateTime sliding) => absolute < sliding ? absolute : sliding
        };
    }

    private async Task RefreshInternalAsync(
        NpgsqlConnection connection,
        string key,
        TimeSpan slidingExpiration,
        DateTime? absoluteExpiration,
        CancellationToken token)
    {
        await using var command = connection.CreateCommand();
        command.CommandText = $"""
            UPDATE {QualifiedTableName}
            SET expires_at_utc = @expiresAt
            WHERE id = @id;
            """;
        command.Parameters.AddWithValue("id", key);
        command.Parameters.AddWithValue("expiresAt", ResolveExpiration(DateTime.UtcNow, absoluteExpiration, slidingExpiration) is { } expiresAt ? expiresAt : DBNull.Value);
        await command.ExecuteNonQueryAsync(token);
    }

    private async Task EnsureTableAsync(CancellationToken token)
    {
        await using var connection = new NpgsqlConnection(options.Value.ConnectionString);
        await connection.OpenAsync(token);
        await using var command = connection.CreateCommand();
        command.CommandText = $"""
            CREATE SCHEMA IF NOT EXISTS "{options.Value.SchemaName}";
            CREATE TABLE IF NOT EXISTS {QualifiedTableName} (
                id text PRIMARY KEY,
                value bytea NOT NULL,
                expires_at_utc timestamptz NULL,
                sliding_expiration_seconds integer NULL,
                absolute_expiration_utc timestamptz NULL
            );
            CREATE INDEX IF NOT EXISTS ix_{options.Value.TableName}_expires_at_utc
                ON {QualifiedTableName} (expires_at_utc);
            """;
        await command.ExecuteNonQueryAsync(token);
    }
}
