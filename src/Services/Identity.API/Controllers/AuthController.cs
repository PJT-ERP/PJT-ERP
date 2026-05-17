using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PJT_HIMTIKA.Identity.Api.Application.Auth;
using PJT_HIMTIKA.Shared.Auth;

namespace PJT_HIMTIKA.Identity.Api.Controllers;

[ApiController]
[Route("api/v1/auth")]
public sealed class AuthController(IAuthService authService) : ControllerBase
{
    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<ActionResult<LoginResponse>> Login(LoginRequest request, CancellationToken cancellationToken)
    {
        var result = await authService.LoginAsync(request, cancellationToken);
        if (result is null)
        {
            return Unauthorized(new { message = "User is not registered or inactive." });
        }

        Response.Cookies.Append("access_token", result.AccessToken, new CookieOptions
        {
            HttpOnly = true,
            Secure = Request.IsHttps,
            SameSite = Request.IsHttps ? SameSiteMode.None : SameSiteMode.Lax,
            Expires = DateTimeOffset.UtcNow.AddHours(12),
            Path = "/"
        });

        return Ok(result);
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

            return Ok(new CurrentUserResponse(userId, email, name, roles, department));
        }

        return Unauthorized();
    }

    [HttpPost("logout")]
    [Authorize]
    public IActionResult Logout()
    {
        Response.Cookies.Delete("access_token", new CookieOptions
        {
            Secure = Request.IsHttps,
            SameSite = Request.IsHttps ? SameSiteMode.None : SameSiteMode.Lax,
            Path = "/"
        });

        return NoContent();
    }
}
