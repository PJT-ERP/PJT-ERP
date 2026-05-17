namespace PJT_HIMTIKA.Shared.Infrastructure.Caching;

public sealed class PostgresCacheOptions
{
    public string ConnectionString { get; set; } = "";
    public string SchemaName { get; set; } = "public";
    public string TableName { get; set; } = "app_cache";
}
