using Microsoft.EntityFrameworkCore;
using PJT_HIMTIKA.Identity.Api.Infrastructure.Persistence;
using PJT_HIMTIKA.Shared.Auth;

namespace PJT_HIMTIKA.Identity.Api.Application.Auth;

public sealed class AuthService(IdentityContext db, JwtTokenIssuer tokenIssuer) : IAuthService
{
    public async Task<LoginResponse?> LoginAsync(LoginRequest request, CancellationToken cancellationToken)
    {
        var user = await db.UserAccounts
            .AsNoTracking()
            .FirstOrDefaultAsync(account => account.Email == request.Email && account.Status == "Active", cancellationToken);

        if (user is null)
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
        db.UserAccounts.Update(user);
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
}
