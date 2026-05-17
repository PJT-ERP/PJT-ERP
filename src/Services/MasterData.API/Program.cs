using Microsoft.EntityFrameworkCore;
using PJT_HIMTIKA.MasterData.Api.Application.Catalog;
using PJT_HIMTIKA.MasterData.Api.Infrastructure.Persistence;
using PJT_HIMTIKA.Shared.Auth;
using PJT_HIMTIKA.Shared.Infrastructure.Abstractions;
using PJT_HIMTIKA.Shared.Infrastructure.Caching;
using PJT_HIMTIKA.Shared.Infrastructure.Messaging;
using PJT_HIMTIKA.Shared.Logging;

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
builder.Services.AddOpenApi();

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<MasterDataContext>();
    await db.Database.EnsureCreatedAsync();
}

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UsePjtRequestLogging();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapGet("/health", () => Results.Ok(new { service = "masterdata", status = "ok" })).AllowAnonymous();
app.Run();
