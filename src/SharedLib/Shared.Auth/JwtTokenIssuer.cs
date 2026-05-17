using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;

namespace PJT_HIMTIKA.Shared.Auth;

public sealed class JwtTokenIssuer(IConfiguration configuration)
{
    public string IssueToken(
        Guid subjectId,
        string email,
        string displayName,
        IEnumerable<string> roles,
        IReadOnlyDictionary<string, string?>? extraClaims = null)
    {
        var jwtKey = configuration["JWT_KEY"]
            ?? Environment.GetEnvironmentVariable("JWT_KEY")
            ?? throw new InvalidOperationException("JWT_KEY is required.");

        var issuer = configuration["Jwt:Issuer"] ?? "PJT-HIMTIKA.Identity";
        var audience = configuration["Jwt:Audience"] ?? "PJT-HIMTIKA.Web";

        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, subjectId.ToString()),
            new(JwtRegisteredClaimNames.Email, email),
            new(ClaimTypes.Name, displayName),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
        };

        claims.AddRange(roles.Distinct(StringComparer.OrdinalIgnoreCase).Select(role => new Claim(ClaimTypes.Role, role)));

        if (extraClaims is not null)
        {
            foreach (var claim in extraClaims.Where(claim => !string.IsNullOrWhiteSpace(claim.Value)))
            {
                claims.Add(new Claim(claim.Key, claim.Value!));
            }
        }

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey));
        var token = new JwtSecurityToken(
            issuer,
            audience,
            claims,
            expires: DateTime.UtcNow.AddHours(12),
            signingCredentials: new SigningCredentials(key, SecurityAlgorithms.HmacSha256));

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
