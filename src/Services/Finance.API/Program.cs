using Microsoft.EntityFrameworkCore;
using PJT_ERP.EventBus.Messages.Events;
using PJT_ERP.Finance.Api.Application.Finance;
using PJT_ERP.Finance.Api.Application.IntegrationEvents;
using PJT_ERP.Finance.Api.Infrastructure.Persistence;
using PJT_ERP.Shared.Auth;
using PJT_ERP.Shared.Infrastructure.Abstractions;
using PJT_ERP.Shared.Infrastructure.Caching;
using PJT_ERP.Shared.Infrastructure.Messaging;
using PJT_ERP.Shared.Logging;

var builder = WebApplication.CreateBuilder(args);

builder.AddPjtLogging();

builder.Services.AddDbContext<FinanceContext>(options =>
{
    options.UseNpgsql(
        builder.Configuration.GetConnectionString("FinanceConnection"),
        npgsql => npgsql.EnableRetryOnFailure(10, TimeSpan.FromSeconds(5), null));
});
builder.Services.AddScoped<IUnitOfWork>(sp => sp.GetRequiredService<FinanceContext>());
builder.Services.AddScoped<IFinanceService, FinanceService>();
if (builder.Environment.IsDevelopment())
{
    builder.Services.AddHostedService<PaymentReadinessBackfillService>();
}
builder.Services.AddPjtPostgresCache(builder.Configuration);
builder.Services.AddPgmqEventBus<FinanceContext>(builder.Configuration, options =>
{
    options.QueueName = "pjt_finance_events";
    options.FanOutQueues = ["pjt_production_events"];
})
    .WithReceiver()
    .AddSubscription<SalesOrderReadyForInvoiceEvent, SalesOrderReadyForInvoiceEventHandler>()
    .AddSubscription<SalesOrderDpInvoiceRequestedEvent, SalesOrderDpInvoiceRequestedEventHandler>();

builder.ConfigurePjtJwtAuthentication();
builder.Services.AddControllers();
builder.Services.AddPjtOpenApi();

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<FinanceContext>();
    await db.EnsureFinanceSchemaAsync();
}

if (app.Environment.IsDevelopment())
{
    app.MapPjtScalarApiReference("PJT ERP Finance API", builder.Configuration, app.Environment);
}

app.UsePjtRequestLogging();
app.UseStaticFiles();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapGet("/health", () => Results.Ok(new { service = "finance", status = "ok" })).AllowAnonymous();
app.Run();
