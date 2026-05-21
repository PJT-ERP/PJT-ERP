using Microsoft.EntityFrameworkCore;
using PJT_ERP.MasterData.Api.Application.Catalog;
using PJT_ERP.MasterData.Api.Infrastructure.Persistence;
using PJT_ERP.Shared.Auth;
using PJT_ERP.Shared.Infrastructure.Abstractions;
using PJT_ERP.Shared.Infrastructure.Caching;
using PJT_ERP.Shared.Infrastructure.Messaging;
using PJT_ERP.Shared.Logging;

var builder = WebApplication.CreateBuilder(args);

builder.AddPjtLogging();

builder.Services.AddDbContext<MasterDataContext>(options =>
{
    options.UseNpgsql(
        builder.Configuration.GetConnectionString("MasterDataConnection"),
        npgsql => npgsql.EnableRetryOnFailure(10, TimeSpan.FromSeconds(5), null));
});
builder.Services.AddScoped<IUnitOfWork>(sp => sp.GetRequiredService<MasterDataContext>());
builder.Services.AddScoped<ICatalogService, CatalogService>();
builder.Services.AddPjtPostgresCache(builder.Configuration);
builder.Services.AddPgmqEventBus<MasterDataContext>(builder.Configuration, options =>
{
    options.QueueName = "pjt_masterdata_events";
    options.FanOutQueues = ["pjt_production_events"];
});

builder.ConfigurePjtJwtAuthentication();
builder.Services.AddControllers();
builder.Services.AddPjtOpenApi();

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<MasterDataContext>();
    await db.Database.MigrateAsync();

    if (app.Environment.IsDevelopment())
    {
        await MasterDataSeeder.SeedAsync(db);
    }
}

if (app.Environment.IsDevelopment())
{
    app.MapPjtScalarApiReference("PJT ERP Master Data API", builder.Configuration, app.Environment);
}

app.UsePjtRequestLogging();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapGet("/health", () => Results.Ok(new { service = "masterdata", status = "ok" })).AllowAnonymous();
app.Run();
