using Microsoft.EntityFrameworkCore;
using PJT_ERP.EventBus.Messages.Events;
using PJT_ERP.Purchasing.Api.Domain.Entities;
using PJT_ERP.Purchasing.Api.Infrastructure.Persistence;
using PJT_ERP.Shared.Infrastructure.Messaging;

namespace PJT_ERP.Purchasing.Api.Application.PurchaseRequests;

public sealed partial class PurchaseRequestService
{
    private static void ValidateCreateRequest(CreatePurchaseRequest request)
    {
        if (request.Items.Count == 0)
        {
            throw new InvalidOperationException("Purchase request must contain at least one item.");
        }

        if (string.IsNullOrWhiteSpace(request.RequesterName))
        {
            throw new InvalidOperationException("Requester name is required.");
        }

        if (request.Items.Any(item => item.Qty <= 0))
        {
            throw new InvalidOperationException("Purchase request item quantity must be greater than zero.");
        }

        if (request.Items.Any(item => !item.MaterialRequirementId.HasValue && string.IsNullOrWhiteSpace(item.ItemName)))
        {
            throw new InvalidOperationException("Item name is required when the item is not linked to a material requirement.");
        }
    }

    private static void ValidateUpdateRequest(UpdatePurchaseRequest request)
    {
        if (request.Items.Count == 0)
        {
            throw new InvalidOperationException("Purchase request must contain at least one item.");
        }

        if (string.IsNullOrWhiteSpace(request.RequesterName))
        {
            throw new InvalidOperationException("Requester name is required.");
        }

        if (request.Items.Any(item => item.Qty <= 0))
        {
            throw new InvalidOperationException("Purchase request item quantity must be greater than zero.");
        }

        if (request.Items.Any(item => !item.MaterialRequirementId.HasValue && string.IsNullOrWhiteSpace(item.ItemName)))
        {
            throw new InvalidOperationException("Item name is required when the item is not linked to a material requirement.");
        }
    }

    private static IQueryable<PurchaseRequest> IncludeItems(IQueryable<PurchaseRequest> query)
    {
        return query
            .Include(request => request.Items)
            .ThenInclude(item => item.MaterialRequirement)
            .Include(request => request.Approvals)
            .AsSplitQuery();
    }

    private static IQueryable<MaterialRequirement> IncludePurchaseItems(IQueryable<MaterialRequirement> query)
    {
        return query
            .Include(requirement => requirement.PurchaseRequestItems)
            .ThenInclude(item => item.PurchaseRequest);
    }

    private static PurchaseRequestDto ToDto(PurchaseRequest request)
    {
        var currentApprovals = request.ActiveApprovalCycleNumber.HasValue
            ? request.Approvals.Where(approval => approval.CycleNumber == request.ActiveApprovalCycleNumber.Value).ToArray()
            : Array.Empty<PurchaseRequestApproval>();
        var financeApproval = currentApprovals.FirstOrDefault(approval => approval.Role == PurchaseRequestApprovalRoles.Finance);
        var ownerApproval = currentApprovals.FirstOrDefault(approval => approval.Role == PurchaseRequestApprovalRoles.Owner);

        // Legacy PRs that already reached FinanceApproved retain their Finance decision,
        // while Owner remains pending until explicitly approved in the new workflow.
        if (request.ActiveApprovalCycleNumber is null && request.Status == PurchaseRequestStatuses.FinanceApproved)
        {
            financeApproval = new PurchaseRequestApproval
            {
                Role = PurchaseRequestApprovalRoles.Finance,
                Decision = request.FinanceReviewedByUserId.HasValue && request.FinanceReviewedAtUtc.HasValue
                    ? PurchaseRequestApprovalDecisions.Approved
                    : PurchaseRequestApprovalDecisions.Pending,
                ActorUserId = request.FinanceReviewedByUserId,
                DecidedAtUtc = request.FinanceReviewedAtUtc,
                RejectionReason = request.FinanceRejectionReason
            };
            ownerApproval = new PurchaseRequestApproval { Role = PurchaseRequestApprovalRoles.Owner };
        }

        var financeDto = financeApproval is null ? null : ToApprovalDto(financeApproval);
        var ownerDto = ownerApproval is null ? null : ToApprovalDto(ownerApproval);
        var fullyApproved = financeDto?.Decision == PurchaseRequestApprovalDecisions.Approved
            && ownerDto?.Decision == PurchaseRequestApprovalDecisions.Approved;
        var blocked = financeDto?.Decision == PurchaseRequestApprovalDecisions.Rejected
            || ownerDto?.Decision == PurchaseRequestApprovalDecisions.Rejected;

        return new PurchaseRequestDto(
            request.Id,
            request.PrNumber,
            request.RequestDate,
            request.RequestedByUserId,
            request.RequesterName,
            request.SalesOrderId,
            request.SalesOrderNumber,
            request.ProjectName,
            request.Status,
            request.ReviewedByUserId,
            request.ReviewedAtUtc,
            request.RejectionReason,
            request.SupervisorReviewedByUserId,
            request.SupervisorReviewedAtUtc,
            request.SupervisorRejectionReason,
            request.FinanceReviewedByUserId,
            request.FinanceReviewedAtUtc,
            request.FinanceRejectionReason,
            request.RevisionNote,
            request.UpdatedAtUtc,
            request.Items
                .OrderBy(item => item.ItemName)
                .Select(ToDto)
                .ToArray(),
            request.ActiveApprovalCycleNumber ?? (financeApproval is not null ? 1 : null),
            financeDto,
            ownerDto,
            fullyApproved,
            blocked);
    }

    private static PurchaseRequestApprovalDecisionDto ToApprovalDto(PurchaseRequestApproval approval) =>
        new(approval.Role, approval.Decision, approval.ActorUserId, approval.DecidedAtUtc, approval.RejectionReason);

    private static PurchaseRequestItemDto ToDto(PurchaseRequestItem item)
    {
        return new PurchaseRequestItemDto(
            item.Id,
            item.MaterialRequirementId,
            item.SalesOrderId,
            item.SalesOrderNumber,
            item.ProjectName,
            item.ItemName,
            item.Size,
            item.Qty,
            item.Urgency,
            item.PurchaseCategory,
            item.Unit,
            item.SuggestedSupplier,
            item.SupplierName,
            item.PoNumber,
            item.EstimatedPrice,
            item.TotalPrice,
            CalculateUnitPrice(item),
            item.PurchaseDate,
            item.ExpectedArrivalDate,
            item.ReceivedDate,
            item.PurchaseStatus,
            item.PurchaseNotes,
            item.RejectionReason,
            item.Notes);
    }

    private static MaterialRequirementDto ToDto(MaterialRequirement requirement)
    {
        return new MaterialRequirementDto(
            requirement.Id,
            requirement.SalesOrderId,
            requirement.SalesOrderNumber,
            requirement.SalesOrderItemId,
            requirement.ProductId,
            requirement.ProductPartNumber,
            requirement.ProductDescription,
            requirement.MaterialSpec,
            requirement.RequiredQty,
            requirement.StockOnHand,
            requirement.StockOnHand - requirement.RequiredQty,
            requirement.StockOnHand < requirement.RequiredQty,
            requirement.StockNotes,
            requirement.StockUpdatedAtUtc,
            requirement.ProjectName,
            requirement.Status,
            requirement.UpdatedAtUtc,
            requirement.PurchaseRequestItems
                .Where(item => item.PurchaseRequest is not null)
                .OrderByDescending(item => item.CreatedAtUtc)
                .Select(item => new LinkedPurchaseItemDto(
                    item.PurchaseRequestId,
                    item.PurchaseRequest!.PrNumber,
                    item.Id,
                    item.PurchaseRequest.Status,
                    item.PurchaseStatus,
                    item.PurchaseCategory,
                    item.SupplierName,
                    item.PoNumber,
                    item.EstimatedPrice,
                    item.TotalPrice,
                    CalculateUnitPrice(item),
                    item.PurchaseDate,
                    item.ExpectedArrivalDate,
                    item.ReceivedDate,
                    item.PurchaseNotes,
                    item.RejectionReason))
                .ToArray());
    }

    private static string ResolveItemName(CreatePurchaseRequestItem item, MaterialRequirement? requirement)
    {
        if (!string.IsNullOrWhiteSpace(item.ItemName))
        {
            return item.ItemName.Trim();
        }

        if (!string.IsNullOrWhiteSpace(requirement?.MaterialSpec))
        {
            return requirement.MaterialSpec;
        }

        return requirement?.ProductDescription ?? "";
    }

    private static string ResolveItemName(UpdatePurchaseRequestItem item, MaterialRequirement? requirement)
    {
        if (!string.IsNullOrWhiteSpace(item.ItemName))
        {
            return item.ItemName.Trim();
        }

        if (!string.IsNullOrWhiteSpace(requirement?.MaterialSpec))
        {
            return requirement.MaterialSpec;
        }

        return requirement?.ProductDescription ?? "";
    }

    private static void ApplySupervisorReview(
        PurchaseRequest purchaseRequest,
        ReviewPurchaseRequest request,
        string decision,
        DateTime now)
    {
        if (purchaseRequest.Status is not PurchaseRequestStatuses.Submitted
            and not PurchaseRequestStatuses.SupervisorApproved
            and not PurchaseRequestStatuses.FinanceRejected
            and not PurchaseRequestStatuses.Rejected)
        {
            throw new InvalidOperationException("Only submitted or rejected purchase requests can receive supervisor approval.");
        }

        purchaseRequest.SupervisorReviewedByUserId = request.ReviewedByUserId;
        purchaseRequest.SupervisorReviewedAtUtc = now;
        purchaseRequest.SupervisorRejectionReason = decision == PurchaseRequestStatuses.Rejected
            ? NormalizeOptional(request.RejectionReason)
            : null;
        purchaseRequest.FinanceReviewedByUserId = null;
        purchaseRequest.FinanceReviewedAtUtc = null;
        purchaseRequest.FinanceRejectionReason = null;
        purchaseRequest.RejectionReason = purchaseRequest.SupervisorRejectionReason;
        purchaseRequest.Status = decision == PurchaseRequestStatuses.Approved
            ? PurchaseRequestStatuses.SupervisorApproved
            : PurchaseRequestStatuses.SupervisorRejected;
        
        purchaseRequest.RevisionNote = null;

        if (decision == PurchaseRequestStatuses.Approved)
        {
            return;
        }

        foreach (var item in purchaseRequest.Items)
        {
            item.PurchaseStatus = PurchaseItemStatuses.Rejected;
            item.RejectionReason = purchaseRequest.SupervisorRejectionReason;
            item.UpdatedAtUtc = now;
            UpdateMaterialRequirementStatus(item, MaterialRequirementStatuses.PurchaseRejected, now);
        }
    }

    private static string NormalizeReviewStage(string? reviewStage)
    {
        if (string.IsNullOrWhiteSpace(reviewStage))
        {
            return PurchaseRequestReviewStages.Finance;
        }

        return reviewStage.Trim() switch
        {
            var value when value.Equals(PurchaseRequestReviewStages.Supervisor, StringComparison.OrdinalIgnoreCase) => PurchaseRequestReviewStages.Supervisor,
            var value when value.Equals("EngineeringSupervisor", StringComparison.OrdinalIgnoreCase) => PurchaseRequestReviewStages.Supervisor,
            var value when value.Equals(PurchaseRequestReviewStages.Finance, StringComparison.OrdinalIgnoreCase) => PurchaseRequestReviewStages.Finance,
            _ => throw new InvalidOperationException("Review stage must be Supervisor or Finance.")
        };
    }

    private static string NormalizeReviewDecision(string decision)
    {
        if (decision.Equals("Accept", StringComparison.OrdinalIgnoreCase)
            || decision.Equals("Accepted", StringComparison.OrdinalIgnoreCase)
            || decision.Equals("Approve", StringComparison.OrdinalIgnoreCase)
            || decision.Equals(PurchaseRequestStatuses.Approved, StringComparison.OrdinalIgnoreCase))
        {
            return PurchaseRequestStatuses.Approved;
        }

        if (decision.Equals("Reject", StringComparison.OrdinalIgnoreCase)
            || decision.Equals(PurchaseRequestStatuses.Rejected, StringComparison.OrdinalIgnoreCase))
        {
            return PurchaseRequestStatuses.Rejected;
        }

        throw new InvalidOperationException("Review decision must be Accept or Reject.");
    }

    private static string NormalizeUrgency(string? urgency)
    {
        if (string.IsNullOrWhiteSpace(urgency))
        {
            return PurchaseItemUrgencies.Normal;
        }

        return urgency.Trim() switch
        {
            var value when value.Equals(PurchaseItemUrgencies.Normal, StringComparison.OrdinalIgnoreCase) => PurchaseItemUrgencies.Normal,
            var value when value.Equals(PurchaseItemUrgencies.Urgent, StringComparison.OrdinalIgnoreCase) => PurchaseItemUrgencies.Urgent,
            var value when value.Equals(PurchaseItemUrgencies.Critical, StringComparison.OrdinalIgnoreCase) => PurchaseItemUrgencies.Critical,
            _ => throw new InvalidOperationException("Purchase urgency must be Normal, Urgent, or Critical.")
        };
    }

    private static string NormalizePurchaseStatus(string? status, DateOnly? purchaseDate, DateOnly? receivedDate)
    {
        if (string.IsNullOrWhiteSpace(status))
        {
            if (receivedDate.HasValue)
            {
                return PurchaseItemStatuses.Received;
            }

            return purchaseDate.HasValue ? PurchaseItemStatuses.Ordered : PurchaseItemStatuses.Requested;
        }

        return status.Trim() switch
        {
            var value when value.Equals(PurchaseItemStatuses.Requested, StringComparison.OrdinalIgnoreCase) => PurchaseItemStatuses.Requested,
            var value when value.Equals(PurchaseItemStatuses.Approved, StringComparison.OrdinalIgnoreCase) => PurchaseItemStatuses.Approved,
            var value when value.Equals(PurchaseItemStatuses.Rejected, StringComparison.OrdinalIgnoreCase) => PurchaseItemStatuses.Rejected,
            var value when value.Equals(PurchaseItemStatuses.Ordered, StringComparison.OrdinalIgnoreCase) => PurchaseItemStatuses.Ordered,
            var value when value.Equals(PurchaseItemStatuses.Received, StringComparison.OrdinalIgnoreCase) => PurchaseItemStatuses.Received,
            _ => throw new InvalidOperationException("Purchase status must be Requested, Approved, Rejected, Ordered, or Received.")
        };
    }

    private static string? NormalizeOptional(string? value)
    {
        return string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    }

    private static void ValidateEstimatedPrice(decimal? estimatedPrice)
    {
        if (estimatedPrice.HasValue && estimatedPrice.Value < 0)
        {
            throw new InvalidOperationException("Estimated price cannot be negative.");
        }
    }

    private static decimal? NormalizePrice(decimal? price, string label)
    {
        if (!price.HasValue)
        {
            return null;
        }

        if (price.Value < 0)
        {
            throw new InvalidOperationException($"{label} cannot be negative.");
        }

        return price.Value;
    }

    private static decimal? CalculateUnitPrice(PurchaseRequestItem item)
    {
        var totalPrice = item.TotalPrice ?? item.EstimatedPrice;
        if (!totalPrice.HasValue || item.Qty <= 0)
        {
            return null;
        }

        return decimal.Round(totalPrice.Value / item.Qty, 2);
    }

    private static string NormalizePurchaseCategory(
        string? category,
        Guid? materialRequirementId,
        Guid? salesOrderId,
        string? itemName = null)
    {
        if (string.IsNullOrWhiteSpace(category))
        {
            return materialRequirementId.HasValue || salesOrderId.HasValue
                ? PurchaseItemCategories.Project
                : PurchaseItemCategories.Consumable;
        }

        return category.Trim() switch
        {
            var value when value.Equals(PurchaseItemCategories.Asset, StringComparison.OrdinalIgnoreCase) => PurchaseItemCategories.Asset,
            var value when value.Equals(PurchaseItemCategories.Consumable, StringComparison.OrdinalIgnoreCase) => PurchaseItemCategories.Consumable,
            var value when value.Equals(PurchaseItemCategories.Tools, StringComparison.OrdinalIgnoreCase) => PurchaseItemCategories.Tools,
            var value when value.Equals(PurchaseItemCategories.Project, StringComparison.OrdinalIgnoreCase) => PurchaseItemCategories.Project,
            var value when value.Equals(PurchaseItemCategories.Maintenance, StringComparison.OrdinalIgnoreCase) => PurchaseItemCategories.Maintenance,
            _ => throw new InvalidOperationException($"Purchase category must be Asset, Consumable, Tools, Project, or Maintenance. Received: '{category}'" + (string.IsNullOrWhiteSpace(itemName) ? "" : $" for item '{itemName}'"))
        };
    }

    private static PurchaseRequestItem FindPurchaseItem(PurchaseRequest purchaseRequest, Guid itemId)
    {
        return purchaseRequest.Items.FirstOrDefault(item => item.Id == itemId)
            ?? throw new InvalidOperationException("Purchase request item was not found.");
    }

    private static void UpdateMaterialRequirementStatus(
        PurchaseRequestItem purchaseItem,
        string status,
        DateTime timestampUtc)
    {
        if (purchaseItem.MaterialRequirement is null)
        {
            return;
        }

        purchaseItem.MaterialRequirement.Status = status;
        purchaseItem.MaterialRequirement.UpdatedAtUtc = timestampUtc;
    }

    private static void EnsurePurchaseRequestAcceptedForPurchasing(PurchaseRequest purchaseRequest, string action)
    {
        if (purchaseRequest.Status is PurchaseRequestStatuses.FinanceApproved
            or PurchaseRequestStatuses.Approved
            or PurchaseRequestStatuses.Processing
            or PurchaseRequestStatuses.Completed)
        {
            return;
        }

        throw new InvalidOperationException($"Purchase request must be approved by Engineering Supervisor before it can {action}.");
    }

    private static bool IsReadyForParallelApproval(PurchaseRequest purchaseRequest)
    {
        var activeItems = purchaseRequest.Items.Where(item => item.PurchaseStatus != PurchaseItemStatuses.Rejected).ToArray();
        return activeItems.Length > 0 && activeItems.All(item =>
            !string.IsNullOrWhiteSpace(item.SupplierName)
            && ((item.TotalPrice.HasValue && item.TotalPrice.Value > 0)
                || (item.EstimatedPrice.HasValue && item.EstimatedPrice.Value > 0)));
    }

    private void EnsureActiveApprovalCycle(PurchaseRequest purchaseRequest, DateTime now)
    {
        if (!IsReadyForParallelApproval(purchaseRequest) || purchaseRequest.ActiveApprovalCycleNumber.HasValue) return;

        var cycle = purchaseRequest.Approvals.Count == 0 ? 1 : purchaseRequest.Approvals.Max(approval => approval.CycleNumber) + 1;
        purchaseRequest.ActiveApprovalCycleNumber = cycle;
        var importFinanceApproval = (purchaseRequest.Status is PurchaseRequestStatuses.FinanceApproved or PurchaseRequestStatuses.Processing)
            && purchaseRequest.FinanceReviewedByUserId.HasValue
            && purchaseRequest.FinanceReviewedAtUtc.HasValue;
        var financeApproval = new PurchaseRequestApproval
        {
            PurchaseRequestId = purchaseRequest.Id,
            PurchaseRequest = purchaseRequest,
            CycleNumber = cycle,
            Role = PurchaseRequestApprovalRoles.Finance,
            Decision = importFinanceApproval ? PurchaseRequestApprovalDecisions.Approved : PurchaseRequestApprovalDecisions.Pending,
            ActorUserId = importFinanceApproval ? purchaseRequest.FinanceReviewedByUserId : null,
            DecidedAtUtc = importFinanceApproval ? purchaseRequest.FinanceReviewedAtUtc : null,
            CreatedAtUtc = now,
            UpdatedAtUtc = now
        };
        var ownerApproval = new PurchaseRequestApproval
        {
            PurchaseRequestId = purchaseRequest.Id,
            PurchaseRequest = purchaseRequest,
            CycleNumber = cycle,
            Role = PurchaseRequestApprovalRoles.Owner,
            Decision = PurchaseRequestApprovalDecisions.Pending,
            CreatedAtUtc = now,
            UpdatedAtUtc = now
        };

        db.PurchaseRequestApprovals.AddRange(financeApproval, ownerApproval);
    }

    private static void ApplyParallelApprovalState(PurchaseRequest purchaseRequest, DateTime now)
    {
        var current = purchaseRequest.Approvals.Where(approval => approval.CycleNumber == purchaseRequest.ActiveApprovalCycleNumber).ToArray();
        var finance = current.Single(approval => approval.Role == PurchaseRequestApprovalRoles.Finance);
        var owner = current.Single(approval => approval.Role == PurchaseRequestApprovalRoles.Owner);
        if (finance.Decision == PurchaseRequestApprovalDecisions.Rejected)
        {
            purchaseRequest.Status = PurchaseRequestStatuses.FinanceRejected;
            purchaseRequest.FinanceRejectionReason = finance.RejectionReason;
            purchaseRequest.RejectionReason = finance.RejectionReason;
            foreach (var item in purchaseRequest.Items.Where(item => item.PurchaseStatus is not PurchaseItemStatuses.Ordered and not PurchaseItemStatuses.Received))
            {
                item.PurchaseStatus = PurchaseItemStatuses.Rejected;
                item.RejectionReason = finance.RejectionReason;
                item.UpdatedAtUtc = now;
                UpdateMaterialRequirementStatus(item, MaterialRequirementStatuses.PurchaseRejected, now);
            }
            return;
        }

        if (owner.Decision == PurchaseRequestApprovalDecisions.Rejected)
        {
            purchaseRequest.Status = PurchaseRequestStatuses.Rejected;
            purchaseRequest.RejectionReason = owner.RejectionReason;
            return;
        }

        purchaseRequest.RejectionReason = null;
        if (finance.Decision == PurchaseRequestApprovalDecisions.Approved && owner.Decision == PurchaseRequestApprovalDecisions.Approved)
        {
            if (purchaseRequest.Status is not PurchaseRequestStatuses.Processing and not PurchaseRequestStatuses.Completed)
                purchaseRequest.Status = PurchaseRequestStatuses.Approved;
            foreach (var item in purchaseRequest.Items.Where(item => item.PurchaseStatus == PurchaseItemStatuses.Requested))
            {
                item.PurchaseStatus = PurchaseItemStatuses.Approved;
                item.UpdatedAtUtc = now;
                UpdateMaterialRequirementStatus(item, MaterialRequirementStatuses.PurchaseApproved, now);
            }
            return;
        }

        if (finance.Decision == PurchaseRequestApprovalDecisions.Approved)
            purchaseRequest.Status = PurchaseRequestStatuses.FinanceApproved;
    }

    private Task EnsureDualApprovalAsync(PurchaseRequest purchaseRequest)
    {
        EnsureActiveApprovalCycle(purchaseRequest, DateTime.UtcNow);
        if (!purchaseRequest.ActiveApprovalCycleNumber.HasValue)
            throw new InvalidOperationException("Supplier and pricing must be complete before purchasing can proceed.");
        var current = purchaseRequest.Approvals.Where(approval => approval.CycleNumber == purchaseRequest.ActiveApprovalCycleNumber.Value).ToArray();
        if (current.Length != 2
            || current.Any(approval => approval.Decision == PurchaseRequestApprovalDecisions.Rejected)
            || current.Any(approval => approval.Decision != PurchaseRequestApprovalDecisions.Approved))
            throw new InvalidOperationException("Finance and Owner approvals are both required before purchasing can proceed.");
        return Task.CompletedTask;
    }

    private async Task<T> ExecuteLockedAsync<T>(Guid purchaseRequestId, Func<Task<T>> operation, CancellationToken cancellationToken)
    {
        var strategy = db.Database.CreateExecutionStrategy();
        return await strategy.ExecuteAsync(async () =>
        {
            // A transient retry must reload state so a rolled-back attempt cannot
            // reuse mutated entities or duplicate approval/outbox records.
            db.ChangeTracker.Clear();
            Microsoft.EntityFrameworkCore.Storage.IDbContextTransaction? transaction = null;
            try
            {
                if (db.Database.IsRelational())
                {
                    transaction = await db.Database.BeginTransactionAsync(cancellationToken);
                    await db.Database.ExecuteSqlInterpolatedAsync(
                        $"SELECT 1 FROM purchase_requests WHERE \"Id\" = {purchaseRequestId} FOR UPDATE",
                        cancellationToken);
                }
                var result = await operation();
                if (transaction is not null) await transaction.CommitAsync(cancellationToken);
                return result;
            }
            catch
            {
                if (transaction is not null) await transaction.RollbackAsync(cancellationToken);
                throw;
            }
            finally
            {
                if (transaction is not null) await transaction.DisposeAsync();
            }
        });
    }

    private static bool IsRejectedRequest(string status)
    {
        return status is PurchaseRequestStatuses.SupervisorRejected
            or PurchaseRequestStatuses.Rejected;
    }

    private static void RefreshPurchaseRequestStatus(PurchaseRequest purchaseRequest)
    {
        if (purchaseRequest.Items.All(item => item.PurchaseStatus == PurchaseItemStatuses.Rejected))
        {
            purchaseRequest.Status = PurchaseRequestStatuses.Rejected;
            purchaseRequest.RejectionReason = string.Join(
                "; ",
                purchaseRequest.Items
                    .Select(item => item.RejectionReason)
                    .Where(reason => !string.IsNullOrWhiteSpace(reason)));
            purchaseRequest.RejectionReason = string.IsNullOrWhiteSpace(purchaseRequest.RejectionReason)
                ? null
                : purchaseRequest.RejectionReason;
            return;
        }
        var activeItems = purchaseRequest.Items
            .Where(item => item.PurchaseStatus != PurchaseItemStatuses.Rejected)
            .ToArray();

        if (activeItems.Length > 0 && activeItems.All(item => item.PurchaseStatus == PurchaseItemStatuses.Received))
        {
            purchaseRequest.Status = PurchaseRequestStatuses.Completed;
            purchaseRequest.RejectionReason = null;
            return;
        }

        if (activeItems.Any(item => item.PurchaseStatus is PurchaseItemStatuses.Ordered
                or PurchaseItemStatuses.Received))
        {
            purchaseRequest.Status = PurchaseRequestStatuses.Processing;
            purchaseRequest.RejectionReason = null;
            return;
        }

        if (activeItems.Any(item => item.PurchaseStatus == PurchaseItemStatuses.Approved))
        {
            purchaseRequest.Status = PurchaseRequestStatuses.FinanceApproved;
            purchaseRequest.RejectionReason = null;
            return;
        }

        purchaseRequest.Status = purchaseRequest.SupervisorReviewedAtUtc.HasValue
            || (purchaseRequest.SalesOrderId == null && string.IsNullOrWhiteSpace(purchaseRequest.SalesOrderNumber))
            || purchaseRequest.Status == PurchaseRequestStatuses.SupervisorApproved
                ? PurchaseRequestStatuses.SupervisorApproved
                : PurchaseRequestStatuses.Submitted;
        purchaseRequest.RejectionReason = null;
    }

    private async Task<string> GenerateNumberAsync(CancellationToken cancellationToken)
    {
        var prefix = "PR-";
        var existingNumbers = await db.PurchaseRequests
            .AsNoTracking()
            .Where(request => request.PrNumber.StartsWith(prefix))
            .Select(request => request.PrNumber)
            .ToListAsync(cancellationToken);

        return $"{prefix}{NextSequence(existingNumbers, prefix):000}";
    }

    private static int NextSequence(IEnumerable<string> existingNumbers, string prefix)
    {
        var max = 0;
        foreach (var number in existingNumbers)
        {
            if (number.Length <= prefix.Length)
            {
                continue;
            }

            if (int.TryParse(number[prefix.Length..], out var value) && value > max)
            {
                max = value;
            }
        }

        return max + 1;
    }
}
