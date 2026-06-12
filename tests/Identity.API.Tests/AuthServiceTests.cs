using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Moq;
using PJT_ERP.Identity.Api.Application.Auth;
using PJT_ERP.Identity.Api.Domain.Entities;
using PJT_ERP.Identity.Api.Infrastructure.Persistence;
using PJT_ERP.Shared.Auth;
using Xunit;

namespace Identity.API.Tests;

public class AuthServiceTests
{
    private readonly IdentityContext _context;
    private readonly JwtTokenIssuer _tokenIssuer;
    private readonly AuthService _authService;

    public AuthServiceTests()
    {
        var options = new DbContextOptionsBuilder<IdentityContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        _context = new IdentityContext(options);

        var inMemorySettings = new Dictionary<string, string?>
        {
            {"JWT_KEY", "SuperSecretKeyForTesting1234567890"}
        };

        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(inMemorySettings)
            .Build();

        _tokenIssuer = new JwtTokenIssuer(configuration);
        _authService = new AuthService(_context, _tokenIssuer);
    }

    [Fact]
    public async Task LoginAsync_ValidCredentials_ReturnsResponse()
    {
        // Arrange
        var passwordHash = BCrypt.Net.BCrypt.HashPassword("TestPassword123!");
        var user = new UserAccount
        {
            Id = Guid.NewGuid(),
            Email = "test@example.com",
            PasswordHash = passwordHash,
            Name = "Test User",
            Role = "User",
            Department = "IT",
            Status = "Active"
        };
        _context.UserAccounts.Add(user);
        await _context.SaveChangesAsync();
        _context.ChangeTracker.Clear();

        var request = new LoginRequest("test@example.com", "TestPassword123!");

        // Act
        var result = await _authService.LoginAsync(request, CancellationToken.None);

        // Assert
        Assert.NotNull(result);
        Assert.Equal("test@example.com", result.Email);
        Assert.NotNull(result.AccessToken);
    }

    [Fact]
    public async Task LoginAsync_InvalidPassword_ReturnsNull()
    {
        // Arrange
        var passwordHash = BCrypt.Net.BCrypt.HashPassword("TestPassword123!");
        var user = new UserAccount
        {
            Id = Guid.NewGuid(),
            Email = "test2@example.com",
            PasswordHash = passwordHash,
            Name = "Test User 2",
            Role = "User",
            Status = "Active"
        };
        _context.UserAccounts.Add(user);
        await _context.SaveChangesAsync();

        var request = new LoginRequest("test2@example.com", "WrongPassword!");

        // Act
        var result = await _authService.LoginAsync(request, CancellationToken.None);

        // Assert
        Assert.Null(result);
    }
}
