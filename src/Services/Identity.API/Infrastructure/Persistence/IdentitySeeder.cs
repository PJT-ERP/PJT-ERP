using Microsoft.EntityFrameworkCore;
using PJT_ERP.Identity.Api.Domain.Entities;

namespace PJT_ERP.Identity.Api.Infrastructure.Persistence;

public static class IdentitySeeder
{
    public static async Task SeedAsync(IdentityContext db)
    {
        var existingEmails = await db.UserAccounts
            .Select(account => account.Email)
            .ToListAsync();

        var seedUsers = new[]
        {
            new UserAccount
            {
                Email = "owner@pjt.local",
                Name = "Wildan Pratama",
                Department = "Executive",
                Role = "Owner",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("Dev123!")
            },
            new UserAccount
            {
                Email = "admin@pjt.local",
                Name = "System Admin",
                Department = "IT",
                Role = "Admin",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("Dev123!")
            },
            new UserAccount
            {
                Email = "sales@pjt.local",
                Name = "Budi Santoso",
                Department = "Sales",
                Role = "Sales",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("Dev123!")
            },
            new UserAccount
            {
                Email = "engineering@pjt.local",
                Name = "Reza Firmansyah",
                Department = "Engineering",
                Role = "Engineering",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("Dev123!")
            },
            new UserAccount
            {
                Email = "engineering-worker@pjt.local",
                Name = "Arief Worker",
                Department = "Engineering",
                Role = "Engineering",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("Dev123!")
            },
            new UserAccount
            {
                Email = "engineering-supervisor@pjt.local",
                Name = "Dimas Supervisor",
                Department = "Engineering",
                Role = "Engineering Supervisor",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("Dev123!")
            },
            new UserAccount
            {
                Email = "purchasing@pjt.local",
                Name = "Ahmad Fauzi",
                Department = "Purchasing",
                Role = "Purchasing",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("Dev123!")
            },
            new UserAccount
            {
                Email = "finance@pjt.local",
                Name = "Dewi Kusuma",
                Department = "Finance",
                Role = "Finance",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("Dev123!")
            }
        };

        db.UserAccounts.AddRange(seedUsers.Where(user => !existingEmails.Contains(user.Email)));

        await db.SaveChangesAsync();
    }
}
