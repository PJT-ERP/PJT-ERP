namespace PJT_ERP.Identity.Api.Application.Auth;

public interface IAuthService
{
    Task<LoginResponse?> LoginAsync(LoginRequest request, CancellationToken cancellationToken);
    Task<CurrentUserResponse?> FindByEmailAsync(string email, CancellationToken cancellationToken);
    Task<IReadOnlyList<CurrentUserResponse>> GetAllUsersAsync(CancellationToken cancellationToken);
    Task<CurrentUserResponse> CreateUserAsync(CreateUserRequest request, CancellationToken cancellationToken);
    Task<CurrentUserResponse?> UpdateUserAsync(Guid userId, UpdateUserRequest request, CancellationToken cancellationToken);
}
