using PJT_ERP.Shared.Auth;
using PJT_ERP.Shared.Logging;
using Scalar.AspNetCore;

var builder = WebApplication.CreateBuilder(args);

builder.AddPjtLogging();
builder.ConfigurePjtJwtAuthentication();

builder.Services.AddResponseCompression(options =>
{
    options.EnableForHttps = true;
});

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("AdminPolicy", policy => policy.RequireRole("Admin", "Owner"));
    options.AddPolicy("AnalyticsPolicy", policy => policy.RequireRole("Admin", "Owner"));
    options.AddPolicy("FinancePolicy", policy => policy.RequireRole("Admin", "Finance", "Owner", "Sales", "Sales Order", "Purchasing"));
    options.AddPolicy("QcPolicy", policy => policy.RequireRole("Admin", "QC", "QC Inspector", "Owner", "Production", "Engineering"));
    options.AddPolicy("ProductionPolicy", policy => policy.RequireRole("Admin", "Engineering", "Engineering Supervisor", "Owner", "Production", "Sales", "Sales Order"));
});


builder.Services.AddCors(options =>
{
    options.AddPolicy("Frontend", policy =>
    {
        var origins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? 
                      ["http://localhost:3000", "http://localhost:5173", "https://innovation-pratama.co.id", "https://dev.innovation-pratama.co.id"];

        if (builder.Environment.IsDevelopment())
        {
            policy.SetIsOriginAllowed(origin =>
                  {
                      if (!Uri.TryCreate(origin, UriKind.Absolute, out var uri)) return false;
                      var host = uri.Host;
                      return host == "localhost" || host == "127.0.0.1" || origins.Contains(origin, StringComparer.OrdinalIgnoreCase);
                  })
                  .AllowAnyHeader()
                  .AllowAnyMethod()
                  .AllowCredentials();
        }
        else
        {
            policy.WithOrigins(origins)
                  .AllowAnyHeader()
                  .AllowAnyMethod()
                  .AllowCredentials();
        }
    });
});

builder.Services
    .AddReverseProxy()
    .LoadFromConfig(builder.Configuration.GetSection("ReverseProxy"));

var app = builder.Build();

app.UsePjtRequestLogging();
app.UseResponseCompression();
app.UseCors("Frontend");
app.UseAuthentication();
app.UseAuthorization();

app.Use(async (context, next) =>
{
    var method = context.Request.Method;
    if (HttpMethods.IsPost(method) || HttpMethods.IsPut(method) || HttpMethods.IsDelete(method) || HttpMethods.IsPatch(method))
    {
        var hasAuthHeader = context.Request.Headers.ContainsKey("Authorization");
        var hasCookieToken = context.Request.Cookies.ContainsKey("access_token");

        if (hasCookieToken && !hasAuthHeader)
        {
            var hasCsrfHeader = context.Request.Headers.ContainsKey("X-Requested-With") ||
                                context.Request.Headers.ContainsKey("X-PJT-Client");

            if (!hasCsrfHeader)
            {
                context.Response.StatusCode = StatusCodes.Status403Forbidden;
                context.Response.ContentType = "application/json";
                await context.Response.WriteAsync("{\"error\":\"CSRF validation failed. Custom client header required for cookie-authenticated requests.\"}");
                return;
            }
        }
    }

    if (!context.Request.Headers.ContainsKey("Authorization") &&
        context.Request.Cookies.TryGetValue("access_token", out var cookieToken) &&
        !string.IsNullOrWhiteSpace(cookieToken))
    {
        context.Request.Headers.Authorization = $"Bearer {cookieToken}";
    }

    context.Request.Headers["X-PJT-Gateway-Forwarded"] = "true";

    await next();
});

app.MapGet("/health", () => Results.Ok(new { service = "gateway", status = "ok" })).AllowAnonymous();

if (app.Environment.IsDevelopment())
{
    app.MapScalarApiReference(options =>
    {
        options.OpenApiRoutePattern = "/openapi/{documentName}/v1.json";
        options.WithTitle("PJT ERP Gateway APIs");
        options.AddPreferredSecuritySchemes("Bearer");
        options.AddHttpAuthentication("Bearer", auth =>
        {
            auth.Token = DevMasterTokenAuthenticationHandler.GetConfiguredToken(builder.Configuration);
        });
        options.AddDocument("identity", "Identity API", "/openapi/identity/v1.json", isDefault: true);
        options.AddDocument("masterdata", "Master Data API", "/openapi/masterdata/v1.json");
        options.AddDocument("production", "Production API", "/openapi/production/v1.json");
        options.AddDocument("qc", "QC API", "/openapi/qc/v1.json");
        options.AddDocument("purchasing", "Purchasing API", "/openapi/purchasing/v1.json");
        options.AddDocument("finance", "Finance API", "/openapi/finance/v1.json");
    }).AllowAnonymous();
}

app.MapReverseProxy();
app.Run();
