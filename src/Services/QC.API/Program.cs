using Microsoft.EntityFrameworkCore;
using PJT_HIMTIKA.EventBus.Messages.Events;
using PJT_HIMTIKA.QC.Api.Application.Inspections;
using PJT_HIMTIKA.QC.Api.Application.IntegrationEvents;
using PJT_HIMTIKA.QC.Api.Infrastructure.Persistence;
using PJT_HIMTIKA.Shared.Auth;
using PJT_HIMTIKA.Shared.Infrastructure.Abstractions;
using PJT_HIMTIKA.Shared.Infrastructure.Caching;
using PJT_HIMTIKA.Shared.Infrastructure.Messaging;
using PJT_HIMTIKA.Shared.Logging;

var builder = WebApplication.CreateBuilder(args);

builder.AddPjtLogging();

builder.Services.AddDbContext<QcContext>(options =>
{
    options.UseNpgsql(
        builder.Configuration.GetConnectionString("QcConnection"),
        npgsql => npgsql.EnableRetryOnFailure(10, TimeSpan.FromSeconds(5), null));
});
builder.Services.AddScoped<IUnitOfWork>(sp => sp.GetRequiredService<QcContext>());
builder.Services.AddScoped<IQcInspectionService, QcInspectionService>();
builder.Services.AddPjtPostgresCache(builder.Configuration);
builder.Services.AddPgmqEventBus<QcContext>(builder.Configuration, options =>
{
    options.QueueName = "pjt_qc_events";
    options.FanOutQueues = ["pjt_production_events"];
})
    .WithReceiver()
    .AddSubscription<SpkCreatedEvent, SpkCreatedEventHandler>()
    .AddSubscription<ProductionFinishedEvent, ProductionFinishedEventHandler>();

builder.ConfigurePjtJwtAuthentication();
builder.Services.AddControllers();
builder.Services.AddOpenApi();

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<QcContext>();
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
app.MapGet("/health", () => Results.Ok(new { service = "qc", status = "ok" })).AllowAnonymous();
app.Run();
