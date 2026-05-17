using PJT_ERP.Identity.Api.Domain.Entities;

namespace PJT_ERP.Identity.Api.Infrastructure.Persistence;

public static class IdentitySeeder
{
    public static async Task SeedAsync(IdentityContext db)
    {
        if (db.UserAccounts.Any())
        {
            return;
        }

        db.UserAccounts.AddRange(
            new UserAccount
            {
                Email = "owner@pjt.local",
                Name = "Owner",
                Department = "Executive",
                Role = "Owner,Admin"
            },
            new UserAccount
            {
                Email = "sales-order@pjt.local",
                Name = "Sales Order",
                Department = "Sales Order",
                Role = "Sales Order"
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
            });

        await db.SaveChangesAsync();
    }
}
