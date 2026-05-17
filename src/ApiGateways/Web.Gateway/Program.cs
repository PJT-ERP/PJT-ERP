using PJT_HIMTIKA.Shared.Auth;
using PJT_HIMTIKA.Shared.Logging;

var builder = WebApplication.CreateBuilder(args);

builder.AddPjtLogging();
builder.ConfigurePjtJwtAuthentication();

builder.Services.AddCors(options =>
{
    options.AddPolicy("Frontend", policy =>
    {
        policy
            .WithOrigins(
                builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ??
                ["http://localhost:3000", "http://localhost:5173"])
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});

builder.Services
    .AddReverseProxy()
    .LoadFromConfig(builder.Configuration.GetSection("ReverseProxy"));

var app = builder.Build();

app.UsePjtRequestLogging();
app.UseCors("Frontend");
app.UseAuthentication();
app.UseAuthorization();
app.MapGet("/health", () => Results.Ok(new { service = "gateway", status = "ok" })).AllowAnonymous();
app.MapReverseProxy();
app.Run();
