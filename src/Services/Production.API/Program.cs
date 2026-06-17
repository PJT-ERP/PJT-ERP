using Microsoft.EntityFrameworkCore;
using PJT_ERP.EventBus.Messages.Events;
using PJT_ERP.Production.Api.Application.Analytics;
using PJT_ERP.Production.Api.Application.IntegrationEvents;
using PJT_ERP.Production.Api.Application.Production;
using PJT_ERP.Production.Api.Infrastructure.Persistence;
using PJT_ERP.Shared.Auth;
using PJT_ERP.Shared.Infrastructure.Abstractions;
using PJT_ERP.Shared.Infrastructure.Caching;
using PJT_ERP.Shared.Infrastructure.Messaging;
using PJT_ERP.Shared.Logging;

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
builder.Services.AddScoped<IAnalyticsService, AnalyticsService>();
builder.Services.AddPjtPostgresCache(builder.Configuration);
builder.Services.AddPgmqEventBus<ProductionContext>(builder.Configuration, options =>
{
    options.QueueName = "pjt_production_events";
    options.FanOutQueues = ["pjt_qc_events", "pjt_purchasing_events", "pjt_finance_events"];
})
    .WithReceiver()
    .AddSubscription<MasterDataUpdatedEvent, MasterDataUpdatedEventHandler>()
    .AddSubscription<InvoicePaymentRecordedEvent, InvoicePaymentRecordedEventHandler>()
    .AddSubscription<QcCheckCompletedEvent, QcCheckCompletedEventHandler>();

builder.ConfigurePjtJwtAuthentication();
builder.Services.AddControllers();
builder.Services.AddPjtOpenApi();

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<ProductionContext>();
    await db.EnsureProductionSchemaAsync();
}

if (app.Environment.IsDevelopment())
{
    app.MapPjtScalarApiReference("PJT ERP Production API", builder.Configuration, app.Environment);
}

app.UsePjtRequestLogging();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapGet("/health", () => Results.Ok(new { service = "production", status = "ok" })).AllowAnonymous();
app.Run();
