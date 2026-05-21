using Microsoft.OpenApi;
using PJT_ERP.Shared.Auth;
using PJT_ERP.Shared.Logging;
using Scalar.AspNetCore;

var builder = WebApplication.CreateBuilder(args);

builder.AddPjtLogging();
builder.ConfigurePjtJwtAuthentication();

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("AnalyticsPolicy", policy => policy.RequireRole("Admin", "Owner"));
    options.AddPolicy("MasterDataPolicy", policy => policy.RequireRole("Admin", "Sales"));
    options.AddPolicy("ProductionPolicy", policy => policy.RequireRole("Admin", "Engineering"));
    options.AddPolicy("QcPolicy", policy => policy.RequireRole("Admin", "Engineering"));
    options.AddPolicy("PurchasingPolicy", policy => policy.RequireRole("Admin", "Finance"));
});

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

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("gateway", new OpenApiInfo
    {
        Title = "PJT ERP Web Gateway",
        Version = "v1"
    });

    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "Paste a valid JWT access token."
    });

    options.AddSecurityRequirement(document => new OpenApiSecurityRequirement
    {
        [new OpenApiSecuritySchemeReference("Bearer", document)] = []
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

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(options =>
    {
        options.SwaggerEndpoint("/swagger/gateway/swagger.json", "PJT ERP Web Gateway v1");
        options.RoutePrefix = "swagger";
    });

    app.MapScalarApiReference(options =>
    {
        options.OpenApiRoutePattern = "/openapi/{documentName}/v1.json";
        options.WithTitle("PJT ERP Gateway APIs");
        options.AddPreferredSecuritySchemes("Bearer");
        options.AddHttpAuthentication("Bearer", auth =>
        {
            auth.Token = "";
        });
        options.AddDocument("identity", "Identity API", "/openapi/identity/v1.json", isDefault: true);
        options.AddDocument("masterdata", "Master Data API", "/openapi/masterdata/v1.json");
        options.AddDocument("production", "Production API", "/openapi/production/v1.json");
        options.AddDocument("qc", "QC API", "/openapi/qc/v1.json");
        options.AddDocument("purchasing", "Purchasing API", "/openapi/purchasing/v1.json");
    }).AllowAnonymous();
}

app.MapReverseProxy();
app.Run();
