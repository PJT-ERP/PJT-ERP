using PJT_HIMTIKA.Identity.Api.Domain.Entities;

namespace PJT_HIMTIKA.Identity.Api.Infrastructure.Persistence;

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
                Email = "sales@pjt.local",
                Name = "Sales",
                Department = "Sales",
                Role = "Sales"
            },
            new UserAccount
            {
                Email = "production@pjt.local",
                Name = "Production",
                Department = "Production",
                Role = "Production"
            },
            new UserAccount
            {
                Email = "qc@pjt.local",
                Name = "QC Inspector",
                Department = "Quality Control",
                Role = "QC"
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
