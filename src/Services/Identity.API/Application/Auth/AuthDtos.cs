namespace PJT_ERP.Identity.Api.Application.Auth;

public sealed record LoginRequest(string Email, string Password);

public sealed record LoginResponse(
    string AccessToken,
    Guid UserId,
    string Email,
    string Name,
    string[] Roles,
    string Department);

public sealed record CurrentUserResponse(
    Guid UserId,
    string Email,
    string Name,
    string[] Roles,
    string Department);
