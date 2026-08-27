using Microsoft.EntityFrameworkCore;
using PJT_ERP.Identity.Api.Application.Auth;
using PJT_ERP.Identity.Api.Infrastructure.Persistence;
using PJT_ERP.Shared.Auth;
using PJT_ERP.Shared.Infrastructure.Abstractions;
using PJT_ERP.Shared.Infrastructure.Caching;
using PJT_ERP.Shared.Logging;

using Microsoft.AspNetCore.RateLimiting;
using System.Threading.RateLimiting;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddRateLimiter(options =>
{
    options.AddPolicy("login", context =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            factory: _ => new FixedWindowRateLimiterOptions
            {
                AutoReplenishment = true,
                PermitLimit = 5,
                QueueLimit = 0,
                Window = TimeSpan.FromMinutes(1)
            }));
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
});

builder.AddPjtLogging();

builder.Services.AddDbContext<IdentityContext>(options =>
{
    options.UseNpgsql(
        builder.Configuration.GetConnectionString("IdentityConnection"),
        npgsql => npgsql.EnableRetryOnFailure(10, TimeSpan.FromSeconds(5), null));
});
builder.Services.AddScoped<IUnitOfWork>(sp => sp.GetRequiredService<IdentityContext>());
builder.Services.AddPjtPostgresCache(builder.Configuration);
builder.Services.AddSingleton<JwtTokenIssuer>();
builder.Services.AddScoped<IAuthService, AuthService>();

builder.ConfigurePjtJwtAuthentication();
builder.Services.AddControllers();
builder.Services.AddPjtOpenApi();

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<IdentityContext>();
    await db.Database.EnsureCreatedAsync();
    var allowSeedInProduction = string.Equals(
        Environment.GetEnvironmentVariable("ALLOW_SEED_IN_PRODUCTION"),
        "true",
        StringComparison.OrdinalIgnoreCase);

    if (app.Environment.IsDevelopment() || allowSeedInProduction)
    {
        await IdentitySeeder.SeedAsync(db);
    }
    else if (app.Environment.IsProduction())
    {
        app.Logger.LogWarning(
            "Identity seeding skipped in Production. Set ALLOW_SEED_IN_PRODUCTION=true explicitly to enable it.");
    }
}

if (app.Environment.IsDevelopment())
{
    app.MapPjtScalarApiReference("PJT ERP Identity API", builder.Configuration, app.Environment);
}

app.UsePjtRequestLogging();
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapGet("/health", () => Results.Ok(new { service = "identity", status = "ok" })).AllowAnonymous();
app.Run();
