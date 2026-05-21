using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.OpenApi;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.OpenApi;
using Scalar.AspNetCore;

namespace PJT_ERP.Shared.Auth;

public static class OpenApiDocumentationExtensions
{
    public static IServiceCollection AddPjtOpenApi(this IServiceCollection services)
    {
        services.AddOpenApi(options =>
        {
            options.AddDocumentTransformer<BearerSecuritySchemeTransformer>();
        });

        return services;
    }

    public static IEndpointRouteBuilder MapPjtScalarApiReference(
        this IEndpointRouteBuilder endpoints,
        string title,
        IConfiguration configuration,
        IHostEnvironment environment)
    {
        endpoints.MapOpenApi().AllowAnonymous();

        endpoints.MapScalarApiReference(options =>
        {
            options
                .WithTitle(title)
                .AddPreferredSecuritySchemes("Bearer")
                .AddHttpAuthentication("Bearer", auth =>
                {
                    auth.Token = "";
                });
        }).AllowAnonymous();

        return endpoints;
    }
}

internal sealed class BearerSecuritySchemeTransformer(
    IAuthenticationSchemeProvider authenticationSchemeProvider) : IOpenApiDocumentTransformer
{
    public async Task TransformAsync(
        OpenApiDocument document,
        OpenApiDocumentTransformerContext context,
        CancellationToken cancellationToken)
    {
        var authenticationSchemes = await authenticationSchemeProvider.GetAllSchemesAsync();
        if (!authenticationSchemes.Any(authScheme => authScheme.Name == PjtAuthenticationSchemes.Bearer))
        {
            return;
        }

        document.Components ??= new OpenApiComponents();
        document.Components.SecuritySchemes ??= new Dictionary<string, IOpenApiSecurityScheme>();
        document.Components.SecuritySchemes["Bearer"] = new OpenApiSecurityScheme
        {
            Type = SecuritySchemeType.Http,
            Scheme = "bearer",
            In = ParameterLocation.Header,
            BearerFormat = "JWT",
            Description = "Paste a valid JWT access token."
        };

        if (document.Paths is null)
        {
            return;
        }

        foreach (var path in document.Paths.Values)
        {
            if (path.Operations is null)
            {
                continue;
            }

            foreach (var operation in path.Operations.Values)
            {
                operation.Security ??= [];
                operation.Security.Add(new OpenApiSecurityRequirement
                {
                    [new OpenApiSecuritySchemeReference("Bearer", document)] = []
                });
            }
        }
    }
}
