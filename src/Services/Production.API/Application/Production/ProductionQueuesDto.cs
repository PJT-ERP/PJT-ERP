namespace PJT_ERP.Production.Api.Application.Production;

using System.Collections.Generic;

public sealed record ProductionQueuesDto(
    IReadOnlyCollection<SalesOrderDto> PendingAssignment,
    IReadOnlyCollection<SalesOrderDto> ReadyToStart,
    IReadOnlyCollection<SalesOrderDto> InProduction,
    IReadOnlyCollection<SalesOrderDto> WaitingQc,
    IReadOnlyCollection<SalesOrderDto> Completed
);

public sealed record EngineeringQueuesDto(
    IReadOnlyCollection<SalesOrderDto> PendingDesign,
    IReadOnlyCollection<SalesOrderDto> RevisionRequired,
    IReadOnlyCollection<SalesOrderDto> WaitingApproval,
    IReadOnlyCollection<SalesOrderDto> Completed
);

public sealed record FinanceCostingQueuesDto(
    IReadOnlyCollection<SalesOrderDto> WaitingPricing,
    IReadOnlyCollection<SalesOrderDto> PricingHistory
);

public sealed record ApprovalQueuesDto(
    IReadOnlyCollection<SalesOrderDto> WaitingClientApproval,
    IReadOnlyCollection<SalesOrderDto> Log
);

public sealed record DashboardCountersDto(
    int TotalActive,
    int PendingDesign,
    int InProduction,
    int WaitingQc,
    int OverdueCount,
    int ReadyForProduction
);
