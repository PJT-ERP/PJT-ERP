using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using System.Threading.RateLimiting;
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
builder.Services.AddScoped<ISalesOrderCommandService, SalesOrderCommandService>();
builder.Services.AddScoped<IProductionCommandService, ProductionCommandService>();
builder.Services.AddScoped<IProductionQueryService, ProductionQueryService>();
builder.Services.AddScoped<IAnalyticsService, AnalyticsService>();
builder.Services.AddHttpContextAccessor();

builder.Services.AddHttpContextAccessor();

builder.Services.AddHttpClient<IMasterDataClient, MasterDataClient>(client =>
{
    var address = builder.Configuration["MasterDataApi__Address"] ?? "http://masterdata-api:8080/";
    client.BaseAddress = new Uri(address);
});
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
builder.Services.AddResponseCompression(options =>
{
    options.EnableForHttps = true;
});
builder.Services.AddPjtOpenApi();

builder.Services.AddRateLimiter(options =>
{
    options.AddPolicy("public", context =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 5,
                Window = TimeSpan.FromMinutes(1),
                QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                QueueLimit = 2
            }));
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
});

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
app.UseResponseCompression();
app.UseStaticFiles();
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapGet("/health", () => Results.Ok(new { service = "production", status = "ok" })).AllowAnonymous();
app.Run();
