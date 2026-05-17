namespace PJT_HIMTIKA.Identity.Api.Domain.Entities;

public sealed class UserAccount
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Name { get; set; } = "";
    public string Email { get; set; } = "";
    public string Role { get; set; } = "";
    public string Department { get; set; } = "";
    public DateTime JoinDateUtc { get; set; } = DateTime.UtcNow;
    public DateTime? LastActiveAtUtc { get; set; }
    public string Status { get; set; } = "Active";
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;

    public string[] RoleList =>
        Role.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

    public bool IsActive => string.Equals(Status, "Active", StringComparison.OrdinalIgnoreCase);
}
