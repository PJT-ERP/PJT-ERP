namespace PJT_ERP.Finance.Api.Domain.Entities;

public sealed class FinanceSetting
{
    public string Id { get; set; } = "default";
    public decimal OpeningBalance { get; set; } = 250_000_000m;
    public decimal MonthlyTarget { get; set; } = 1_000_000_000m;
}
