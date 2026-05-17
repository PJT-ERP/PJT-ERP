using Microsoft.EntityFrameworkCore;
using PJT_HIMTIKA.Purchasing.Api.Application.PurchaseRequests;
using PJT_HIMTIKA.Purchasing.Api.Infrastructure.Persistence;
using PJT_HIMTIKA.Shared.Auth;
using PJT_HIMTIKA.Shared.Infrastructure.Abstractions;
using PJT_HIMTIKA.Shared.Infrastructure.Caching;
using PJT_HIMTIKA.Shared.Infrastructure.Messaging;
using PJT_HIMTIKA.Shared.Logging;

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
});

builder.ConfigurePjtJwtAuthentication();
builder.Services.AddControllers();
builder.Services.AddOpenApi();

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<PurchasingContext>();
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
app.MapGet("/health", () => Results.Ok(new { service = "purchasing", status = "ok" })).AllowAnonymous();
app.Run();
