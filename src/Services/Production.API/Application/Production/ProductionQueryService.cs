using Microsoft.EntityFrameworkCore;
using PJT_ERP.EventBus.Messages.Events;
using PJT_ERP.Production.Api.Domain.Entities;
using PJT_ERP.Production.Api.Infrastructure.Persistence;
using PJT_ERP.Shared.Infrastructure.Messaging;

namespace PJT_ERP.Production.Api.Application.Production;

public class ProductionQueryService(
    ProductionContext db, 
    IEventPublisher eventPublisher,
    IMasterDataClient masterDataClient) : ProductionServiceBase(db, eventPublisher, masterDataClient), IProductionQueryService
{
    public async Task<IReadOnlyCollection<SalesOrderDto>> ListSalesOrdersAsync(CancellationToken cancellationToken)
    {
        var orders = await db.SalesOrders
            .AsNoTracking()
            .Include(order => order.Items)
            .Include(order => order.ProductionOrders)
            .Include(order => order.DesignRevisions)
            .AsSplitQuery()
            .OrderByDescending(order => order.CreatedAtUtc)
            .ToListAsync(cancellationToken);

        var productIds = orders.SelectMany(o => o.Items).Select(i => i.ProductId).Distinct().ToList();
        var boms = productIds.Count > 0 ? await masterDataClient.GetBomStockAsync(productIds, cancellationToken) : Array.Empty<BomStockDto>();

        return orders.Select(o => ToDto(o, boms)).ToArray();
    }

    public async Task<SalesOrderProductionProgressDto?> GetSalesOrderProgressAsync(Guid salesOrderId, CancellationToken cancellationToken)
    {
        var salesOrder = await IncludeProduction(db.SalesOrders.AsNoTracking())
            .FirstOrDefaultAsync(order => order.Id == salesOrderId, cancellationToken);

        return salesOrder is null ? null : ToProgressDto(salesOrder);
    }

    public async Task<SalesOrderProductionProgressDto?> GetSalesOrderTrackingByCodeAsync(string trackingCode, CancellationToken cancellationToken)
    {
        var salesOrder = await FindSalesOrderByTrackingCodeAsync(trackingCode, asNoTracking: true, cancellationToken);
        return salesOrder is null ? null : ToProgressDto(salesOrder);
    }

    public async Task<PublicProductionTrackingDto?> GetPublicTrackingAsync(string trackingCode, CancellationToken cancellationToken)
    {
        var salesOrder = await FindSalesOrderByTrackingCodeAsync(trackingCode, asNoTracking: true, cancellationToken);
        return salesOrder is null ? null : ToPublicTrackingDto(salesOrder);
    }

    public async Task<ExecutiveDashboardDto> GetExecutiveDashboardAsync(CancellationToken cancellationToken)
    {
        var orders = await db.ProductionOrders.AsNoTracking().ToListAsync(cancellationToken);
        var goQc = orders.Count(order => IsQcGo(order.QcDecision));
        var noGoQc = orders.Count(order => IsQcNoGo(order.QcDecision));
        var reviewedOrders = goQc + noGoQc;
        var noGoRate = reviewedOrders == 0 ? 0 : decimal.Round((decimal)noGoQc / reviewedOrders * 100, 2);

        return new ExecutiveDashboardDto(
            orders.Count(order => order.Status == ProductionOrderStatuses.Waiting),
            orders.Count(order => order.Status == ProductionOrderStatuses.InProgress),
            orders.Count(order => order.Status == ProductionOrderStatuses.Finished),
            orders.Count(order => order.Status == ProductionOrderStatuses.Closed),
            goQc,
            noGoQc,
            noGoRate);
    }

    public async Task<ProductionQueuesDto> GetProductionQueuesAsync(Guid? userId, string userRole, CancellationToken cancellationToken)
    {
        var allOrders = await ListSalesOrdersAsync(cancellationToken);
        
        bool isSupervisor = userRole == "Engineering Supervisor" || userRole == "Owner" || userRole == "Admin" || userRole == "QC";
        
        bool IsAssignedToUser(SalesOrderDto so) => 
            !so.ProductionWorkerUserId.HasValue || 
            so.ProductionWorkerUserId == userId || 
            isSupervisor;
            
        bool IsReadyForProd(SalesOrderDto so)
        {
            if (so.Status == "Ready for Production") return true;
            if (so.QcDecision == "NoGo") return true;
            if (so.StartedAtUtc.HasValue || !string.IsNullOrEmpty(so.QcDecision)) return false;
            
            var validStatuses = new[] { "Waiting Pricing", "Waiting Payment", "Pending Design", "Waiting Approval" };
            if (so.DesignStatus == "Approved" && validStatuses.Contains(so.Status)) return true;
            
            return false;
        }

        var pendingAssignment = allOrders.Where(so => !so.ProductionWorkerUserId.HasValue && IsReadyForProd(so)).ToList();
        
        var readyToStart = allOrders.Where(so => so.ProductionWorkerUserId.HasValue && IsAssignedToUser(so) && (!so.StartedAtUtc.HasValue || so.QcDecision == "NoGo") && IsReadyForProd(so)).ToList();
        
        var inProduction = allOrders.Where(so => so.StartedAtUtc.HasValue && !so.FinishedAtUtc.HasValue && so.QcDecision != "NoGo" && IsAssignedToUser(so)).ToList();
        
        var waitingQc = allOrders.Where(so => so.FinishedAtUtc.HasValue && string.IsNullOrEmpty(so.QcDecision) && IsAssignedToUser(so)).ToList();

        var completed = allOrders.Where(so => so.FinishedAtUtc.HasValue && so.QcDecision == "Go" && IsAssignedToUser(so)).ToList();

        return new ProductionQueuesDto(pendingAssignment, readyToStart, inProduction, waitingQc, completed);
    }

    public async Task<EngineeringQueuesDto> GetEngineeringQueuesAsync(Guid? userId, string userRole, CancellationToken cancellationToken)
    {
        var allOrders = await ListSalesOrdersAsync(cancellationToken);
        
        bool isSupervisor = userRole == "Engineering Supervisor" || userRole == "Owner" || userRole == "Admin";
        
        bool IsAssignedToUser(SalesOrderDto so) => 
            !so.DesignWorkerUserId.HasValue || 
            so.DesignWorkerUserId == userId || 
            isSupervisor;

        var engineeringStatuses = new[] { "Pending Design", "Revision Required", "Waiting Approval", "Approved" };

        var pendingDesign = allOrders.Where(so => so.DesignStatus == SalesOrderDesignStatuses.PendingDesign && IsAssignedToUser(so)).ToList();
        var revisionRequired = allOrders.Where(so => so.DesignStatus == SalesOrderDesignStatuses.RevisionRequired && IsAssignedToUser(so)).ToList();
        var waitingApproval = allOrders.Where(so => so.DesignStatus == SalesOrderDesignStatuses.WaitingApproval && IsAssignedToUser(so)).ToList();
        var completed = allOrders.Where(so => so.DesignStatus == SalesOrderDesignStatuses.Approved && IsAssignedToUser(so)).ToList();

        return new EngineeringQueuesDto(pendingDesign, revisionRequired, waitingApproval, completed);
    }

    public async Task<FinanceCostingQueuesDto> GetFinanceCostingQueuesAsync(CancellationToken cancellationToken)
    {
        var allOrders = await ListSalesOrdersAsync(cancellationToken);
        
        var waitingPricing = allOrders.Where(so => !so.IsCostingCompleted && (so.Status == "Waiting Pricing" || so.Status == "Ready for Production" || so.Status == "InProduction" || so.Status == "QC" || so.Status == "Completed")).ToList();
        var pricingHistory = allOrders.Where(so => so.IsCostingCompleted).ToList();

        return new FinanceCostingQueuesDto(waitingPricing, pricingHistory);
    }

    public async Task<ApprovalQueuesDto> GetApprovalQueuesAsync(CancellationToken cancellationToken)
    {
        var allOrders = await ListSalesOrdersAsync(cancellationToken);
        
        var waitingClientApproval = allOrders.Where(so => so.Status == "Waiting Client Approval").ToList();
        var log = allOrders.Where(so => so.Status == "Waiting Payment" || so.Status == "Rejected" || so.Status == "Revision Required").ToList();

        return new ApprovalQueuesDto(waitingClientApproval, log);
    }

    public async Task<DashboardCountersDto> GetDashboardCountersAsync(Guid? userId, string userRole, CancellationToken cancellationToken)
    {
        var allOrders = await ListSalesOrdersAsync(cancellationToken);
        
        bool isSupervisor = userRole == "Engineering Supervisor" || userRole == "Owner" || userRole == "Admin";
        
        var totalActive = allOrders.Count(so => so.Status != "Closed" && so.Status != "Rejected");
        var pendingDesign = allOrders.Count(so => so.DesignStatus == SalesOrderDesignStatuses.PendingDesign);
        var inProduction = allOrders.Count(so => so.Status == "InProduction");
        var readyForProduction = allOrders.Count(so => so.Status == "Ready for Production");
        var waitingQc = allOrders.Count(so => so.Status == "QC");
        
        var overdue = allOrders.Count(so => 
            so.TargetDate.HasValue && 
            so.TargetDate.Value.ToDateTime(TimeOnly.MinValue) < DateTime.UtcNow &&
            so.Status != "Selesai" && 
            so.Status != "Closed");

        return new DashboardCountersDto(totalActive, pendingDesign, inProduction, waitingQc, overdue, readyForProduction);
    }

    public async Task<QcQueuesDto> GetQcQueuesAsync(CancellationToken cancellationToken)
    {
        var allOrders = await ListSalesOrdersAsync(cancellationToken);
        
        var readyForInspection = allOrders.Where(so => so.Status == "QC").ToList();
        var inspectionHistory = allOrders.Where(so => so.Status == "Completed" || so.Status == "Rejected" || !string.IsNullOrEmpty(so.QcDecision)).ToList();

        return new QcQueuesDto(readyForInspection, inspectionHistory);
    }

    public async Task<ProductionBoardQueuesDto> GetProductionBoardQueuesAsync(Guid? userId, string userRole, CancellationToken cancellationToken)
    {
        var allOrders = await ListSalesOrdersAsync(cancellationToken);

        bool IsAssignedToUser(SalesOrderDto so) => 
            !so.ProductionWorkerUserId.HasValue || 
            so.ProductionWorkerUserId == userId || 
            userRole == "Admin" || userRole == "Owner" || userRole == "Engineering Supervisor";
        
        var pendingAssignment = allOrders.Where(so => (so.Status == "Ready for Production" || (so.Status == "QC" && so.QcDecision == "NoGo")) && so.ProductionWorkerUserId == null).ToList();
        var readyToStart = allOrders.Where(so => (so.Status == "Ready for Production" || (so.Status == "QC" && so.QcDecision == "NoGo")) && so.ProductionWorkerUserId != null && IsAssignedToUser(so)).ToList();
        var inProduction = allOrders.Where(so => so.Status == "InProduction" && IsAssignedToUser(so)).ToList();
        var paused = allOrders.Where(so => so.Status == "Paused" && IsAssignedToUser(so)).ToList();
        var waitingQc = allOrders.Where(so => so.Status == "QC" && string.IsNullOrEmpty(so.QcDecision) && IsAssignedToUser(so)).ToList();
        var completed = allOrders.Where(so => so.FinishedAtUtc.HasValue && so.QcDecision == "Go" && IsAssignedToUser(so)).ToList();

        return new ProductionBoardQueuesDto(pendingAssignment, readyToStart, inProduction, paused, waitingQc, completed);
    }
}
