using Microsoft.EntityFrameworkCore;
using PJT_HIMTIKA.Identity.Api.Application.Auth;
using PJT_HIMTIKA.Identity.Api.Infrastructure.Persistence;
using PJT_HIMTIKA.Shared.Auth;
using PJT_HIMTIKA.Shared.Infrastructure.Abstractions;
using PJT_HIMTIKA.Shared.Infrastructure.Caching;
using PJT_HIMTIKA.Shared.Logging;

var builder = WebApplication.CreateBuilder(args);

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
    await IdentitySeeder.SeedAsync(db);
}

if (app.Environment.IsDevelopment())
{
    app.MapPjtScalarApiReference("PJT ERP Identity API", builder.Configuration, app.Environment);
}

app.UsePjtRequestLogging();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapGet("/health", () => Results.Ok(new { service = "identity", status = "ok" })).AllowAnonymous();
app.Run();
