using Microsoft.EntityFrameworkCore;
using PJT_HIMTIKA.EventBus.Messages.Events;
using PJT_HIMTIKA.Production.Api.Application.IntegrationEvents;
using PJT_HIMTIKA.Production.Api.Application.Production;
using PJT_HIMTIKA.Production.Api.Infrastructure.Persistence;
using PJT_HIMTIKA.Shared.Auth;
using PJT_HIMTIKA.Shared.Infrastructure.Abstractions;
using PJT_HIMTIKA.Shared.Infrastructure.Caching;
using PJT_HIMTIKA.Shared.Infrastructure.Messaging;
using PJT_HIMTIKA.Shared.Logging;

var builder = WebApplication.CreateBuilder(args);

builder.AddPjtLogging();

builder.Services.AddDbContext<ProductionContext>(options =>
{
    options.UseNpgsql(
        builder.Configuration.GetConnectionString("ProductionConnection"),
        npgsql => npgsql.EnableRetryOnFailure(10, TimeSpan.FromSeconds(5), null));
});
builder.Services.AddScoped<IUnitOfWork>(sp => sp.GetRequiredService<ProductionContext>());
builder.Services.AddScoped<IProductionService, ProductionService>();
builder.Services.AddPjtPostgresCache(builder.Configuration);
builder.Services.AddPgmqEventBus<ProductionContext>(builder.Configuration, options =>
{
    options.QueueName = "pjt_production_events";
    options.FanOutQueues = ["pjt_qc_events"];
})
    .WithReceiver()
    .AddSubscription<MasterDataUpdatedEvent, MasterDataUpdatedEventHandler>()
    .AddSubscription<QcCheckCompletedEvent, QcCheckCompletedEventHandler>();

builder.ConfigurePjtJwtAuthentication();
builder.Services.AddControllers();
builder.Services.AddOpenApi();

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<ProductionContext>();
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
app.MapGet("/health", () => Results.Ok(new { service = "production", status = "ok" })).AllowAnonymous();
app.Run();
