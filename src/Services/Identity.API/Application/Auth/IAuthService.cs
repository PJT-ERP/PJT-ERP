namespace PJT_HIMTIKA.Identity.Api.Application.Auth;

public interface IAuthService
{
    Task<LoginResponse?> LoginAsync(LoginRequest request, CancellationToken cancellationToken);
    Task<CurrentUserResponse?> FindByEmailAsync(string email, CancellationToken cancellationToken);
}
