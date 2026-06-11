using Microsoft.EntityFrameworkCore;
using PJT_ERP.EventBus.Messages.Events;
using PJT_ERP.Purchasing.Api.Application.IntegrationEvents;
using PJT_ERP.Purchasing.Api.Application.PurchaseRequests;
using PJT_ERP.Purchasing.Api.Infrastructure.Persistence;
using PJT_ERP.Shared.Auth;
using PJT_ERP.Shared.Infrastructure.Abstractions;
using PJT_ERP.Shared.Infrastructure.Caching;
using PJT_ERP.Shared.Infrastructure.Messaging;
using PJT_ERP.Shared.Logging;

var builder = WebApplication.CreateBuilder(args);

builder.AddPjtLogging();

builder.Services.AddDbContext<PurchasingContext>(options =>
{
    options.UseNpgsql(
        builder.Configuration.GetConnectionString("PurchasingConnection"),
        npgsql => npgsql.EnableRetryOnFailure(10, TimeSpan.FromSeconds(5), null));
});
builder.Services.AddScoped<IUnitOfWork>(sp => sp.GetRequiredService<PurchasingContext>());
builder.Services.AddScoped<IPurchaseRequestService, PurchaseRequestService>();
builder.Services.AddPjtPostgresCache(builder.Configuration);
builder.Services.AddPgmqEventBus<PurchasingContext>(builder.Configuration, options =>
{
    options.QueueName = "pjt_purchasing_events";
    options.FanOutQueues = ["pjt_production_events"];
})
    .WithReceiver()
    .AddSubscription<SalesOrderConfirmedEvent, SalesOrderConfirmedEventHandler>()
    .AddSubscription<SpkCreatedEvent, SpkCreatedEventHandler>()
    .AddSubscription<MaterialRequestSubmittedEvent, MaterialRequestSubmittedEventHandler>();

builder.ConfigurePjtJwtAuthentication();
builder.Services.AddControllers();
builder.Services.AddPjtOpenApi();

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<PurchasingContext>();
    await db.EnsurePurchasingSchemaAsync();
}

if (app.Environment.IsDevelopment())
{
    app.MapPjtScalarApiReference("PJT ERP Purchasing API", builder.Configuration, app.Environment);
}

app.UsePjtRequestLogging();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapGet("/health", () => Results.Ok(new { service = "purchasing", status = "ok" })).AllowAnonymous();
app.Run();
