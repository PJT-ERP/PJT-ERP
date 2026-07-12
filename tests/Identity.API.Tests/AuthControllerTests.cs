using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Moq;
using PJT_ERP.Identity.Api.Application.Auth;
using PJT_ERP.Identity.Api.Controllers;
using PJT_ERP.Shared.Auth;
using Xunit;

namespace Identity.API.Tests;

public class AuthControllerTests
{
    private readonly Mock<IAuthService> _authServiceMock;
    private readonly AuthController _authController;

    public AuthControllerTests()
    {
        _authServiceMock = new Mock<IAuthService>();
        var loggerMock = new Mock<Microsoft.Extensions.Logging.ILogger<AuthController>>();
        _authController = new AuthController(_authServiceMock.Object, loggerMock.Object);
        
        // Setup HttpContext for Cookies
        var httpContext = new DefaultHttpContext();
        _authController.ControllerContext = new ControllerContext()
        {
            HttpContext = httpContext
        };
    }

    [Fact]
    public async Task Login_ValidCredentials_ReturnsOkAndSetsCookie()
    {
        // Arrange
        var request = new LoginRequest("test@example.com", "Password123!");
        var expectedResponse = new LoginResponse(
            "fake-jwt-token",
            Guid.NewGuid(),
            "test@example.com",
            "Test User",
            new[] { "User" },
            "IT"
        );

        _authServiceMock
            .Setup(x => x.LoginAsync(request, It.IsAny<CancellationToken>()))
            .ReturnsAsync(expectedResponse);

        // Act
        var result = await _authController.Login(request, CancellationToken.None);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var response = Assert.IsType<LoginResponse>(okResult.Value);
        Assert.Equal(string.Empty, response.AccessToken);

        // Verify cookie was set
        var setCookieHeader = _authController.HttpContext.Response.Headers["Set-Cookie"].ToString();
        Assert.Contains("access_token=fake-jwt-token", setCookieHeader);
    }

    [Fact]
    public async Task Login_InvalidCredentials_ReturnsUnauthorized()
    {
        // Arrange
        var request = new LoginRequest("test@example.com", "WrongPassword");

        _authServiceMock
            .Setup(x => x.LoginAsync(request, It.IsAny<CancellationToken>()))
            .ReturnsAsync((LoginResponse?)null);

        // Act
        var result = await _authController.Login(request, CancellationToken.None);

        // Assert
        var unauthorizedResult = Assert.IsType<UnauthorizedObjectResult>(result.Result);
        Assert.NotNull(unauthorizedResult.Value);
    }
}
