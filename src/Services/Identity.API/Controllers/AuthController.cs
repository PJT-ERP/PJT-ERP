using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Microsoft.AspNetCore.RateLimiting;
using PJT_ERP.Identity.Api.Application.Auth;
using PJT_ERP.Shared.Auth;

namespace PJT_ERP.Identity.Api.Controllers;

[ApiController]
[Route("api/v1/auth")]
public sealed class AuthController(IAuthService authService, ILogger<AuthController> logger) : ControllerBase
{
    [HttpPost("login")]
    [AllowAnonymous]
    [EnableRateLimiting("login")]
    public async Task<ActionResult<LoginResponse>> Login(LoginRequest request, CancellationToken cancellationToken)
{
    var clientIp = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "Unknown IP";
    var result = await authService.LoginAsync(request, cancellationToken);
    if (result is null)
    {
        logger.LogWarning("Security Audit: Failed login attempt for email {Email} from IP {ClientIp}", request.Email, clientIp);
        return Unauthorized(new { message = "User is not registered or inactive." });
    }

    logger.LogInformation("Security Audit: Successful login for user {UserId} ({Email}) from IP {ClientIp}", result.UserId, result.Email, clientIp);

    Response.Cookies.Append("access_token", result.AccessToken, new CookieOptions
    {
        HttpOnly = true,
        Secure = Request.IsHttps,
        SameSite = Request.IsHttps ? SameSiteMode.None : SameSiteMode.Lax,
        Expires = DateTimeOffset.UtcNow.AddHours(12),
        Path = "/",
        IsEssential = true
    });
  
    var secureResponse = new LoginResponse(
        AccessToken: string.Empty, 
        UserId: result.UserId,
        Email: result.Email,
        Name: result.Name,
        Roles: result.Roles,
        Department: result.Department
    );
    return Ok(secureResponse);
}

[HttpPost("logout")]
[Authorize]
public ActionResult Logout()
{
    var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "Unknown User";
    var clientIp = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "Unknown IP";
    logger.LogInformation("Security Audit: User {UserId} logged out from IP {ClientIp}", userId, clientIp);

    Response.Cookies.Delete("access_token", new CookieOptions
    {
        HttpOnly = true,
        Secure = Request.IsHttps,
        SameSite = Request.IsHttps ? SameSiteMode.None : SameSiteMode.Lax,
        Path = "/"
    });
    return Ok(new { message = "Logged out successfully." });
}

    [HttpGet("me")]
    [Authorize]
    public async Task<ActionResult<CurrentUserResponse>> Me(CancellationToken cancellationToken)
    {
        var email = User.FindFirstValue(ClaimTypes.Email);
        if (string.IsNullOrWhiteSpace(email))
        {
            return Unauthorized();
        }

        var result = await authService.FindByEmailAsync(email, cancellationToken);
        if (result is not null)
        {
            return Ok(result);
        }

        if (User.Identity?.AuthenticationType == PjtAuthenticationSchemes.DevMasterToken)
        {
            var userId = Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var parsedUserId)
                ? parsedUserId
                : Guid.Empty;
            var name = User.FindFirstValue(ClaimTypes.Name) ?? "Development Master User";
            var department = User.FindFirstValue("department") ?? "Development";
            var roles = User.FindAll(ClaimTypes.Role).Select(claim => claim.Value).ToArray();

            return Ok(new CurrentUserResponse(userId, email, name, roles, department, "Active"));
        }

        return Unauthorized();
    }


    [HttpGet("users")]
    [Authorize]
    public async Task<ActionResult<IReadOnlyList<CurrentUserResponse>>> GetUsers(CancellationToken cancellationToken)
    {
        var users = await authService.GetAllUsersAsync(cancellationToken);
        return Ok(users);
    }

    [HttpPost("users")]
    [Authorize]
    public async Task<ActionResult<CurrentUserResponse>> CreateUser(CreateUserRequest request, CancellationToken cancellationToken)
    {
        var user = await authService.CreateUserAsync(request, cancellationToken);
        return Created($"/api/v1/auth/users/{user.UserId}", user);
    }

    [HttpPut("users/{userId:guid}")]
    [Authorize]
    public async Task<ActionResult<CurrentUserResponse>> UpdateUser(Guid userId, UpdateUserRequest request, CancellationToken cancellationToken)
    {
        var user = await authService.UpdateUserAsync(userId, request, cancellationToken);
        if (user is null)
        {
            return NotFound();
        }
        return Ok(user);
    }

    [HttpDelete("users/{userId:guid}")]
    [Authorize]
    public async Task<IActionResult> DeleteUser(Guid userId, CancellationToken cancellationToken)
    {
        var deleted = await authService.DeleteUserAsync(userId, cancellationToken);
        if (!deleted)
        {
            return NotFound();
        }
        return NoContent();
    }
}
