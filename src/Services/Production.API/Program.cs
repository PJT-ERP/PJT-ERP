using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using System.Threading.RateLimiting;
using PJT_ERP.EventBus.Messages.Events;
using PJT_ERP.Production.Api.Application.Analytics;
using PJT_ERP.Production.Api.Application.IntegrationEvents;
using PJT_ERP.Production.Api.Application.Production;
using PJT_ERP.Production.Api.Application.Quotations;
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
builder.Services.AddScoped<IQuotationService, QuotationService>();
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
builder.Services.AddHttpClient("IdentityApi", client =>
{
    var address = builder.Configuration["IdentityApi:Address"] ?? "http://localhost:5001/";
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
app.UseRateLimiter();
app.UseAuthentication();
// Temporary, token-safe diagnostics to identify whether the quotation list
// 403 is caused by its role attribute or by the action's Identity-ID guard.
app.Use(async (context, next) =>
{
    var quotationListRequest = HttpMethods.IsGet(context.Request.Method)
        && string.Equals(context.Request.Path.Value, "/api/v1/sales/quotations", StringComparison.OrdinalIgnoreCase);
    await next();
    if (quotationListRequest)
    {
        var principal = context.User;
        var roleClaims = principal.Claims
            .Where(claim => claim.Type == System.Security.Claims.ClaimTypes.Role || claim.Type is "role" or "roles")
            .Select(claim => claim.Value)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToArray();
        app.Logger.LogInformation(
            "Quotation list auth diagnostic at Production API: Status={StatusCode}, Authenticated={IsAuthenticated}, AuthType={AuthenticationType}, Name={Name}, NameIdentifier={NameIdentifier}, Sub={Subject}, RoleClaimType={RoleClaimType}, Roles=[{Roles}], InRoleEngineering={InRoleEngineering}, InRoleSupervisor={InRoleSupervisor}",
            context.Response.StatusCode,
            principal.Identity?.IsAuthenticated ?? false,
            principal.Identity?.AuthenticationType,
            principal.Identity?.Name,
            principal.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value,
            principal.FindFirst("sub")?.Value,
            principal.Identities.FirstOrDefault(identity => identity.IsAuthenticated)?.RoleClaimType,
            string.Join(",", roleClaims),
            principal.IsInRole("Engineering"),
            principal.IsInRole("Engineering Supervisor"));
    }
});
app.UseAuthorization();

app.UseStaticFiles(new StaticFileOptions
{
    OnPrepareResponse = ctx =>
    {
        ctx.Context.Response.Headers.Append("Cache-Control", "private,no-cache,no-store,must-revalidate");
        ctx.Context.Response.Headers.Append("X-Content-Type-Options", "nosniff");
        ctx.Context.Response.Headers.Append("Content-Security-Policy", "default-src 'none'; sandbox");
    }
});

app.MapControllers();
app.MapGet("/health", () => Results.Ok(new { service = "production", status = "ok" })).AllowAnonymous();
app.Run();

