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
                Name = "Owner",
                Department = "Executive",
                Role = "Owner,Admin"
            },
            new UserAccount
            {
                Email = "admin@pjt.local",
                Name = "Admin",
                Department = "Executive",
                Role = "Admin"
            },
            new UserAccount
            {
                Email = "sales@pjt.local",
                Name = "Sales",
                Department = "Sales",
                Role = "Sales,Sales Order"
            },
            new UserAccount
            {
                Email = "engineering@pjt.local",
                Name = "Engineering",
                Department = "Engineering",
                Role = "Engineering"
            },
            new UserAccount
            {
                Email = "engineering-worker@pjt.local",
                Name = "Engineering Worker",
                Department = "Engineering",
                Role = "Engineering Worker"
            },
            new UserAccount
            {
                Email = "engineering-supervisor@pjt.local",
                Name = "Engineering Supervisor",
                Department = "Engineering",
                Role = "Engineering Supervisor,Engineering Reviewer"
            },
            new UserAccount
            {
                Email = "purchasing@pjt.local",
                Name = "Purchasing",
                Department = "Purchasing",
                Role = "Purchasing"
            },
            new UserAccount
            {
                Email = "finance@pjt.local",
                Name = "Finance",
                Department = "Finance",
                Role = "Finance"
            }
        };

        db.UserAccounts.AddRange(seedUsers.Where(user => !existingEmails.Contains(user.Email)));

        await db.SaveChangesAsync();
    }
}
