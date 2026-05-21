using Microsoft.EntityFrameworkCore;
using PJT_ERP.Identity.Api.Infrastructure.Persistence;
using PJT_ERP.Shared.Auth;

namespace PJT_ERP.Identity.Api.Application.Auth;

public sealed class AuthService(IdentityContext db, JwtTokenIssuer tokenIssuer) : IAuthService
{
    public async Task<LoginResponse?> LoginAsync(LoginRequest request, CancellationToken cancellationToken)
    {
        var normalizedEmail = request.Email.Trim().ToLowerInvariant();

        var user = await db.UserAccounts
            .FirstOrDefaultAsync(account => account.Email == normalizedEmail && account.Status == "Active", cancellationToken);

        if (user is null || string.IsNullOrWhiteSpace(user.PasswordHash))
        {
            return null;
        }

        if (!VerifyPassword(request.Password, user.PasswordHash))
        {
            return null;
        }

        var roles = user.RoleList;
        var token = tokenIssuer.IssueToken(
            user.Id,
            user.Email,
            user.Name,
            roles,
            new Dictionary<string, string?>
            {
                ["department"] = user.Department
            });

        user.LastActiveAtUtc = DateTime.UtcNow;
        user.UpdatedAtUtc = DateTime.UtcNow;
        await db.SaveChangesAsync(cancellationToken);

        return new LoginResponse(token, user.Id, user.Email, user.Name, roles, user.Department);
    }

    public async Task<CurrentUserResponse?> FindByEmailAsync(string email, CancellationToken cancellationToken)
    {
        var user = await db.UserAccounts
            .AsNoTracking()
            .FirstOrDefaultAsync(account => account.Email == email && account.Status == "Active", cancellationToken);

        return user is null
            ? null
            : new CurrentUserResponse(user.Id, user.Email, user.Name, user.RoleList, user.Department);
    }

    private static bool VerifyPassword(string password, string passwordHash)
    {
        try
        {
            return BCrypt.Net.BCrypt.Verify(password, passwordHash);
        }
        catch (BCrypt.Net.SaltParseException)
        {
            return false;
        }
    }
}
