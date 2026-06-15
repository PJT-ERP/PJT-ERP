using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace PJT_ERP.Shared.Auth;

public sealed class DevMasterTokenAuthenticationHandler(
    IOptionsMonitor<AuthenticationSchemeOptions> options,
    ILoggerFactory logger,
    UrlEncoder encoder,
    IConfiguration configuration,
    IHostEnvironment environment)
    : AuthenticationHandler<AuthenticationSchemeOptions>(options, logger, encoder)
{
    private static readonly string[] DevRoles =
    [
        "Admin",
        "Owner",
        "Sales",
        "Sales Order",
        "Finance",
        "Engineering Worker",
        "Engineering Supervisor",
        "Purchasing"
    ];

    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        if (!ShouldUseDevMasterToken(Request, configuration, environment))
        {
            return Task.FromResult(AuthenticateResult.NoResult());
        }

        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, "00000000-0000-0000-0000-000000000001"),
            new(ClaimTypes.Name, "Development Master User"),
            new(ClaimTypes.Email, "dev-master@pjt.local"),
            new("department", "Development")
        };

        claims.AddRange(DevRoles.Select(role => new Claim(ClaimTypes.Role, role)));

        var identity = new ClaimsIdentity(claims, Scheme.Name, ClaimTypes.Name, ClaimTypes.Role);
        var principal = new ClaimsPrincipal(identity);
        var ticket = new AuthenticationTicket(principal, Scheme.Name);
        return Task.FromResult(AuthenticateResult.Success(ticket));
    }

    public static bool ShouldUseDevMasterToken(HttpRequest request, IConfiguration configuration, IHostEnvironment environment)
    {
        if (!environment.IsDevelopment())
        {
            return false;
        }

        return TryReadToken(request, out var providedToken)
            && MatchesConfiguredToken(providedToken, configuration);
    }

    public static string GetConfiguredToken(IConfiguration configuration)
    {
        return configuration["DevMasterToken:Token"]
            ?? configuration["DEV_MASTER_TOKEN"]
            ?? Environment.GetEnvironmentVariable("DEV_MASTER_TOKEN")
            ?? "dev-master-token";
    }

    private static bool TryReadToken(HttpRequest request, out string providedToken)
    {
        if (request.Headers.TryGetValue(PjtAuthenticationSchemes.DevMasterTokenHeaderName, out var headerToken)
            && !string.IsNullOrWhiteSpace(headerToken.ToString()))
        {
            providedToken = headerToken.ToString().Trim();
            return true;
        }

        var authorization = request.Headers.Authorization.ToString();
        const string bearerPrefix = "Bearer ";
        if (authorization.StartsWith(bearerPrefix, StringComparison.OrdinalIgnoreCase))
        {
            providedToken = authorization[bearerPrefix.Length..].Trim();
            return true;
        }

        const string devMasterPrefix = "DevMaster ";
        if (authorization.StartsWith(devMasterPrefix, StringComparison.OrdinalIgnoreCase))
        {
            providedToken = authorization[devMasterPrefix.Length..].Trim();
            return true;
        }

        providedToken = "";
        return false;
    }

    private static bool MatchesConfiguredToken(string providedToken, IConfiguration configuration)
    {
        var expectedToken = GetConfiguredToken(configuration);
        var providedBytes = Encoding.UTF8.GetBytes(providedToken);
        var expectedBytes = Encoding.UTF8.GetBytes(expectedToken);
        return providedBytes.Length == expectedBytes.Length
            && CryptographicOperations.FixedTimeEquals(providedBytes, expectedBytes);
    }
}
