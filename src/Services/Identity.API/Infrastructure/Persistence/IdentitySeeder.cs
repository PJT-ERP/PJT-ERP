using Microsoft.EntityFrameworkCore;
using PJT_ERP.Identity.Api.Domain.Entities;

namespace PJT_ERP.Identity.Api.Infrastructure.Persistence;

public static class IdentitySeeder
{
    public static async Task SeedAsync(IdentityContext db, CancellationToken cancellationToken = default)
    {
        if (await db.UserAccounts.AnyAsync(cancellationToken))
        {
            return;
        }

        var passwordHash = BCrypt.Net.BCrypt.HashPassword("Dev123!", workFactor: 12);

        db.UserAccounts.AddRange(
            SeedUser("owner@test.com", "Owner", "Executive", "Owner", passwordHash),
            SeedUser("admin@test.com", "Admin", "System", "Admin", passwordHash),
            SeedUser("finance@test.com", "Finance", "Finance", "Finance", passwordHash),
            SeedUser("sales@test.com", "Sales", "Sales", "Sales", passwordHash),
            SeedUser("engineering@test.com", "Engineering", "Engineering", "Engineering", passwordHash));

        await db.SaveChangesAsync(cancellationToken);
    }

    private static UserAccount SeedUser(
        string email,
        string name,
        string department,
        string role,
        string passwordHash) =>
        new()
        {
            Email = email,
            Name = name,
            Department = department,
            Role = role,
            PasswordHash = passwordHash,
            Status = "Active"
        };
}
