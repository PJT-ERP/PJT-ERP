using Microsoft.EntityFrameworkCore;
using PJT_ERP.EventBus.Messages.Events;
using PJT_ERP.Production.Api.Domain.Entities;
using PJT_ERP.Production.Api.Infrastructure.Persistence;
using PJT_ERP.Shared.Infrastructure.Messaging;

namespace PJT_ERP.Production.Api.Application.Production;

public sealed partial class ProductionService
{
    private async Task<SalesOrder?> FindSalesOrderByTrackingCodeAsync(
        string trackingCode,
        bool asNoTracking,
        CancellationToken cancellationToken)
    {
        var normalizedTrackingCode = trackingCode.Trim();
        if (string.IsNullOrWhiteSpace(normalizedTrackingCode))
        {
            throw new InvalidOperationException("Tracking code is required.");
        }

        Guid? parsedId = null;
        if (normalizedTrackingCode.StartsWith("PJT|SO|", StringComparison.OrdinalIgnoreCase))
        {
            var parts = normalizedTrackingCode.Split('|');
            if (parts.Length >= 4 && Guid.TryParse(parts[3], out var guid))
            {
                parsedId = guid;
            }
        }
        else if (Guid.TryParse(normalizedTrackingCode, out var directGuid))
        {
            parsedId = directGuid;
        }

        var query = IncludeProduction(asNoTracking ? db.SalesOrders.AsNoTracking() : db.SalesOrders);
        return await query.FirstOrDefaultAsync(
            order =>
                (parsedId.HasValue && order.Id == parsedId.Value)
                || order.SoNumber == normalizedTrackingCode
                || order.ProductionOrders.Any(productionOrder =>
                    productionOrder.BarcodeUid == normalizedTrackingCode
                    || productionOrder.PoNumber == normalizedTrackingCode),
            cancellationToken);
    }

    private static SalesOrderDto ToDto(SalesOrder order)
    {
        var productionOrder = GetPrimaryProductionOrder(order);

        return new SalesOrderDto(
            order.Id,
            order.SoNumber,
            order.CustomerId,
            order.CustomerCode,
            order.CustomerName,
            order.CustomerEmail,
            order.CustomerDrawingUrl,
            order.DesignReference,
            order.DesignStatus,
            order.DesignApprovedByUserId,
            order.DesignApprovedByName,
            order.DesignApprovedAtUtc,
            order.RejectionReason,
            order.SoDate,
            order.TargetDate,
            order.DesignWorkerUserId,
            order.DesignWorkerName,
            order.ProductionWorkerUserId,
            order.ProductionWorkerName,
            order.QcReviewerUserId,
            order.QcReviewerName,
            order.Status,
            productionOrder?.Status ?? ProductionOrderStatuses.Waiting,
            productionOrder?.StartedAtUtc,
            productionOrder?.FinishedAtUtc,
            productionOrder?.QcDecision,
            productionOrder?.DrawingFileUrl,
            productionOrder?.PauseReason,
            order.CreatedAtUtc,
            order.UpdatedAtUtc,
            order.EstimatedAmount,
            order.DesignRevisions.OrderBy(r => r.Version).Select(r => new SalesOrderDesignRevisionDto(r.Version, r.Url, r.ChangedBy, r.ChangedAtUtc)).ToArray(),
            order.Items.OrderBy(item => item.ProductPartNumber).Select(ToDto).ToArray(),
            order.ProductionPhotos,
            order.QcPhotos);
    }

    private static SalesOrderItemDto ToDto(SalesOrderItem item)
    {
        return new SalesOrderItemDto(
            item.Id,
            item.ProductId,
            item.ProductPartNumber,
            item.ProductDescription,
            item.Qty,
            item.UnitPrice,
            item.Notes,
            item.DesignReference,
            item.CustomerDrawingUrl);
    }

    private static SalesOrderProductionProgressDto ToProgressDto(SalesOrder order)
    {
        var productionOrder = GetPrimaryProductionOrder(order);
        var updatedAtUtc = productionOrder is null || order.UpdatedAtUtc >= productionOrder.UpdatedAtUtc
            ? order.UpdatedAtUtc
            : productionOrder.UpdatedAtUtc;

        return new SalesOrderProductionProgressDto(
            order.Id,
            order.SoNumber,
            order.CustomerCode,
            order.CustomerName,
            order.CustomerEmail,
            order.CustomerDrawingUrl,
            order.DesignReference,
            order.DesignStatus,
            order.DesignApprovedByUserId,
            order.DesignApprovedByName,
            order.DesignApprovedAtUtc,
            order.DesignWorkerUserId,
            order.DesignWorkerName,
            order.ProductionWorkerUserId,
            order.ProductionWorkerName,
            order.QcReviewerUserId,
            order.QcReviewerName,
            order.Status,
            productionOrder?.Status ?? ProductionOrderStatuses.Waiting,
            order.Items.Count,
            order.Items.Sum(item => item.Qty),
            CalculateProgressPercent(order, productionOrder),
            productionOrder?.DrawingRef,
            productionOrder?.DrawingFileUrl,
            productionOrder?.DrawingUploadedByUserId,
            productionOrder?.DrawingUploaderName,
            productionOrder?.DrawingUploadedAtUtc,
            productionOrder?.BarcodeUid,
            productionOrder?.StartedAtUtc,
            productionOrder?.StartedByUserId,
            productionOrder?.StartedByName,
            productionOrder?.FinishedAtUtc,
            productionOrder?.FinishedByUserId,
            productionOrder?.FinishedByName,
            productionOrder is null ? null : CalculateDurationSeconds(productionOrder),
            productionOrder?.QcDecision,
            productionOrder?.PauseReason,
            updatedAtUtc,
            order.Items
                .OrderBy(item => item.ProductPartNumber)
                .Select(item => new SalesOrderProductionProgressItemDto(
                    item.Id,
                    item.ProductId,
                    item.ProductPartNumber,
                    item.ProductDescription,
                    item.Qty,
                    item.DesignReference,
                    item.CustomerDrawingUrl))
                .ToArray());
    }

    private static PublicProductionTrackingDto ToPublicTrackingDto(SalesOrder order)
    {
        var productionOrder = GetPrimaryProductionOrder(order);
        var updatedAtUtc = productionOrder is null || order.UpdatedAtUtc >= productionOrder.UpdatedAtUtc
            ? order.UpdatedAtUtc
            : productionOrder.UpdatedAtUtc;

        return new PublicProductionTrackingDto(
            order.SoNumber,
            order.CustomerName,
            order.CustomerDrawingUrl,
            order.DesignReference,
            order.Status,
            productionOrder?.Status ?? ProductionOrderStatuses.Waiting,
            order.Items.Count,
            order.Items.Sum(item => item.Qty),
            CalculateProgressPercent(order, productionOrder),
            productionOrder?.DrawingFileUrl,
            productionOrder?.StartedAtUtc,
            productionOrder?.FinishedAtUtc,
            productionOrder is null ? null : CalculateDurationSeconds(productionOrder),
            updatedAtUtc,
            order.Items
                .OrderBy(item => item.ProductPartNumber)
                .Select(item => new PublicProductionTrackingItemDto(
                    item.ProductPartNumber,
                    item.ProductDescription,
                    item.Qty,
                    item.DesignReference,
                    item.CustomerDrawingUrl))
                .ToArray());
    }

    private static decimal CalculateProgressPercent(SalesOrder order, ProductionOrder? prodOrder)
    {
        var soStatus = (order.Status ?? "").ToLowerInvariant();
        var prodStatus = (prodOrder?.Status ?? "").ToLowerInvariant();

        if (soStatus == "completed" || prodStatus == "closed") return 100;
        if (prodStatus == "finished") return 80;
        if (prodStatus == "inprogress" || prodStatus == "in_progress" || prodStatus == "paused" || soStatus == "inproduction" || soStatus == "in_production") return 60;
        if (soStatus == "ready for production" || soStatus == "waiting pricing" || soStatus == "menunggu invoice dp" || prodStatus == "waiting") return 40;
        if (soStatus == "confirmed") return 20;
        if (soStatus == "waiting spv approval") return 10;
        if (soStatus == "pending design" || soStatus == "revision required") return 5;

        return 0;
    }

    private static long? CalculateDurationSeconds(ProductionOrder order)
    {
        if (!order.StartedAtUtc.HasValue)
        {
            return null;
        }

        var end = order.FinishedAtUtc ?? (order.Status == ProductionOrderStatuses.InProgress ? DateTime.UtcNow : null);
        if (!end.HasValue)
        {
            return null;
        }

        return Math.Max(0, (long)Math.Round((end.Value - order.StartedAtUtc.Value).TotalSeconds));
    }

    private static bool IsQcGo(string? decision)
    {
        return decision is not null
            && (decision.Equals("Go", StringComparison.OrdinalIgnoreCase)
                || decision.Equals("Approved", StringComparison.OrdinalIgnoreCase)
                || decision.Equals("Approve", StringComparison.OrdinalIgnoreCase)
                || decision.Equals("Pass", StringComparison.OrdinalIgnoreCase));
    }

    private static bool IsQcNoGo(string? decision)
    {
        return decision is not null
            && (decision.Equals("NoGo", StringComparison.OrdinalIgnoreCase)
                || decision.Equals("No Go", StringComparison.OrdinalIgnoreCase)
                || decision.Equals("Rejected", StringComparison.OrdinalIgnoreCase)
                || decision.Equals("Reject", StringComparison.OrdinalIgnoreCase)
                || decision.Equals("Fail", StringComparison.OrdinalIgnoreCase));
    }

    private static IQueryable<SalesOrder> IncludeProduction(IQueryable<SalesOrder> query)
    {
        return query
            .Include(order => order.Items)
            .Include(order => order.ProductionOrders);
    }

    private static ProductionOrder? GetPrimaryProductionOrder(SalesOrder salesOrder)
    {
        return salesOrder.ProductionOrders
            .OrderBy(order => order.CreatedAtUtc)
            .FirstOrDefault();
    }

    private static void ValidateSalesOrderItems(IReadOnlyCollection<CreateSalesOrderItemRequest> items)
    {
        if (items.Count == 0)
        {
            throw new InvalidOperationException("Sales order must contain at least one item.");
        }

        if (items.Any(item => item.Qty <= 0))
        {
            throw new InvalidOperationException("Sales order item quantity must be greater than zero.");
        }
    }

    private static EngineerAssignment? NormalizeAssignment(EngineerAssignment? assignment, string label)
    {
        if (assignment is null)
        {
            return null;
        }

        if (assignment.UserId == Guid.Empty)
        {
            throw new InvalidOperationException($"{label} user id is required.");
        }

        if (string.IsNullOrWhiteSpace(assignment.Name))
        {
            throw new InvalidOperationException($"{label} name is required.");
        }

        return assignment with { Name = assignment.Name.Trim() };
    }

    private static void ApplyAssignment(SalesOrder salesOrder, AssignSalesOrderEngineersRequest request)
    {
        var designWorker = NormalizeAssignment(request.DesignWorker, "Design worker");
        var productionWorker = NormalizeAssignment(request.ProductionWorker, "Production worker");
        var qcReviewer = NormalizeAssignment(request.QcReviewer, "QC reviewer");

        if (designWorker is not null)
        {
            salesOrder.DesignWorkerUserId = designWorker.UserId;
            salesOrder.DesignWorkerName = designWorker.Name;
        }

        if (productionWorker is not null)
        {
            salesOrder.ProductionWorkerUserId = productionWorker.UserId;
            salesOrder.ProductionWorkerName = productionWorker.Name;
        }

        if (qcReviewer is not null)
        {
            salesOrder.QcReviewerUserId = qcReviewer.UserId;
            salesOrder.QcReviewerName = qcReviewer.Name;
        }
    }

    private static void EnsureEngineersAssigned(SalesOrder salesOrder)
    {
        if (!salesOrder.ProductionWorkerUserId.HasValue || string.IsNullOrWhiteSpace(salesOrder.ProductionWorkerName))
        {
            throw new InvalidOperationException("A production worker engineer must be assigned before the sales order is confirmed.");
        }

        if (!salesOrder.QcReviewerUserId.HasValue || string.IsNullOrWhiteSpace(salesOrder.QcReviewerName))
        {
            throw new InvalidOperationException("A QC reviewer engineer must be assigned before the sales order is confirmed.");
        }
    }

    private static void EnsureDesignApproved(SalesOrder salesOrder)
    {
        if (salesOrder.DesignStatus != SalesOrderDesignStatuses.Approved)
        {
            throw new InvalidOperationException("Sales order design must be approved before the sales order is confirmed.");
        }
    }

    private static void ValidateWorkerRequest(ProductionStatusUpdateRequest request)
    {
        if (request.WorkerUserId == Guid.Empty)
        {
            throw new InvalidOperationException("Worker user id is required.");
        }

        if (string.IsNullOrWhiteSpace(request.WorkerName))
        {
            throw new InvalidOperationException("Worker name is required.");
        }
    }

    private static void ValidateDrawingUploadRequest(UploadEngineeringDrawingRequest request)
    {
        if (request.UploadedByUserId == Guid.Empty)
        {
            throw new InvalidOperationException("Uploader user id is required.");
        }

        if (string.IsNullOrWhiteSpace(request.UploaderName))
        {
            throw new InvalidOperationException("Uploader name is required.");
        }
    }

    private static void ValidateMaterialRequest(SubmitProductionMaterialRequest request)
    {
        if (request.RequestedByUserId == Guid.Empty)
        {
            throw new InvalidOperationException("Requester user id is required.");
        }

        if (string.IsNullOrWhiteSpace(request.RequesterName))
        {
            throw new InvalidOperationException("Requester name is required.");
        }

        if (request.Items.Count == 0)
        {
            throw new InvalidOperationException("Material request must contain at least one item.");
        }

        if (request.Items.Any(item => string.IsNullOrWhiteSpace(item.ItemName)))
        {
            throw new InvalidOperationException("Material request item name is required.");
        }

        if (request.Items.Any(item => item.Qty <= 0))
        {
            throw new InvalidOperationException("Material request item quantity must be greater than zero.");
        }
    }

    private static void EnsureAssignedWorker(Guid? assignedWorkerId, Guid workerUserId, bool isPrivileged = false)
    {
        // Privileged users (Admin, Owner, Engineering Supervisor) can bypass worker assignment check
        if (isPrivileged)
        {
            return;
        }

        // If no worker is assigned yet, allow any engineering team member to submit
        if (!assignedWorkerId.HasValue)
        {
            return;
        }

        if (assignedWorkerId.Value != workerUserId)
        {
            throw new InvalidOperationException("Only the assigned worker can perform this action.");
        }
    }

    private static void StartProduction(ProductionOrder productionOrder, ProductionStatusUpdateRequest request, DateTime timestampUtc)
    {
        if (productionOrder.Status == ProductionOrderStatuses.Closed)
        {
            throw new InvalidOperationException("Closed sales order production cannot be changed.");
        }

        if (productionOrder.Status == ProductionOrderStatuses.Finished)
        {
            throw new InvalidOperationException("Finished sales order production cannot be started again.");
        }

        productionOrder.Status = ProductionOrderStatuses.InProgress;
        productionOrder.StartedAtUtc ??= timestampUtc;
        productionOrder.StartedByUserId ??= request.WorkerUserId;
        productionOrder.StartedByName ??= request.WorkerName.Trim();
        productionOrder.UpdatedAtUtc = timestampUtc;
    }

    private static void FinishProduction(ProductionOrder productionOrder, ProductionStatusUpdateRequest request, DateTime timestampUtc)
    {
        if (productionOrder.Status == ProductionOrderStatuses.Closed)
        {
            throw new InvalidOperationException("Closed sales order production cannot be changed.");
        }

        if (!productionOrder.StartedAtUtc.HasValue || productionOrder.Status == ProductionOrderStatuses.Waiting)
        {
            throw new InvalidOperationException("Production must be started by the assigned worker before it can be finished.");
        }

        productionOrder.Status = ProductionOrderStatuses.Finished;
        productionOrder.FinishedAtUtc ??= timestampUtc;
        productionOrder.FinishedByUserId ??= request.WorkerUserId;
        productionOrder.FinishedByName ??= request.WorkerName.Trim();
        productionOrder.UpdatedAtUtc = timestampUtc;
    }

    private static void PauseProduction(ProductionOrder productionOrder, ProductionStatusUpdateRequest request, DateTime timestampUtc)
    {
        if (productionOrder.Status == ProductionOrderStatuses.Closed || productionOrder.Status == ProductionOrderStatuses.Finished)
        {
            throw new InvalidOperationException("Closed or finished sales order production cannot be paused.");
        }

        if (string.IsNullOrWhiteSpace(request.Reason))
        {
            throw new InvalidOperationException("Pause reason must be provided.");
        }

        productionOrder.Status = ProductionOrderStatuses.Paused;
        productionOrder.PauseReason = request.Reason.Trim();
        productionOrder.UpdatedAtUtc = timestampUtc;
    }

    private static void ResumeProduction(ProductionOrder productionOrder, ProductionStatusUpdateRequest request, DateTime timestampUtc)
    {
        if (productionOrder.Status != ProductionOrderStatuses.Paused)
        {
            throw new InvalidOperationException("Only paused production can be resumed.");
        }

        productionOrder.Status = ProductionOrderStatuses.InProgress;
        productionOrder.PauseReason = null;
        productionOrder.UpdatedAtUtc = timestampUtc;
    }

    private static SalesOrderConfirmedItem[] BuildConfirmedItems(SalesOrder salesOrder)
    {
        return salesOrder.Items
            .OrderBy(item => item.ProductPartNumber)
            .Select(item => new SalesOrderConfirmedItem(
                item.Id,
                item.ProductId,
                item.Qty,
                item.ProductPartNumber,
                item.ProductDescription,
                item.ProductMaterialSpec,
                item.Notes))
            .ToArray();
    }

    private static SpkCreatedItem[] BuildSpkItems(SalesOrder salesOrder)
    {
        return salesOrder.Items
            .OrderBy(item => item.ProductPartNumber)
            .Select(item => new SpkCreatedItem(
                item.Id,
                item.ProductId,
                item.Qty,
                item.ProductPartNumber,
                item.ProductDescription,
                item.ProductMaterialSpec,
                item.Notes))
            .ToArray();
    }

    private static string? NormalizeOptional(string? value)
    {
        return string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    }

    private static string? NormalizeOptionalUrl(string? value, string label)
    {
        var normalized = NormalizeOptional(value);
        if (normalized is null)
        {
            return null;
        }

        if (!Uri.TryCreate(normalized, UriKind.Absolute, out var uri)
            || uri.Scheme is not ("http" or "https"))
        {
            throw new InvalidOperationException($"{label} must be a valid HTTP or HTTPS link.");
        }

        return uri.ToString();
    }

    private static Guid? NormalizeSalesOrderItemId(Guid? salesOrderItemId)
    {
        return salesOrderItemId == Guid.Empty ? null : salesOrderItemId;
    }

    private static string NormalizeMaterialRequestUrgency(string? urgency)
    {
        if (string.IsNullOrWhiteSpace(urgency))
        {
            return "Normal";
        }

        return urgency.Trim() switch
        {
            var value when value.Equals("Normal", StringComparison.OrdinalIgnoreCase) => "Normal",
            var value when value.Equals("Urgent", StringComparison.OrdinalIgnoreCase) => "Urgent",
            var value when value.Equals("Critical", StringComparison.OrdinalIgnoreCase) => "Critical",
            _ => throw new InvalidOperationException("Material request urgency must be Normal, Urgent, or Critical.")
        };
    }

    private static string? NormalizeMaterialRequestCategory(string? category)
    {
        if (string.IsNullOrWhiteSpace(category))
        {
            return "Project";
        }

        return category.Trim() switch
        {
            var value when value.Equals("Asset", StringComparison.OrdinalIgnoreCase) => "Asset",
            var value when value.Equals("Consumable", StringComparison.OrdinalIgnoreCase) => "Consumable",
            var value when value.Equals("Tools", StringComparison.OrdinalIgnoreCase) => "Tools",
            var value when value.Equals("Project", StringComparison.OrdinalIgnoreCase) => "Project",
            var value when value.Equals("Maintenance", StringComparison.OrdinalIgnoreCase) => "Maintenance",
            _ => throw new InvalidOperationException("Material request purchase category must be Asset, Consumable, Tools, Project, or Maintenance.")
        };
    }

    private static string NormalizeDesignStatus(string? status)
    {
        if (string.IsNullOrWhiteSpace(status))
        {
            return SalesOrderDesignStatuses.PendingDesign;
        }

        return status.Trim() switch
        {
            var value when value.Equals(SalesOrderDesignStatuses.PendingDesign, StringComparison.OrdinalIgnoreCase) => SalesOrderDesignStatuses.PendingDesign,
            var value when value.Equals(SalesOrderDesignStatuses.WaitingApproval, StringComparison.OrdinalIgnoreCase) => SalesOrderDesignStatuses.WaitingApproval,
            var value when value.Equals(SalesOrderDesignStatuses.Approved, StringComparison.OrdinalIgnoreCase) => SalesOrderDesignStatuses.Approved,
            var value when value.Equals(SalesOrderDesignStatuses.RevisionRequired, StringComparison.OrdinalIgnoreCase) => SalesOrderDesignStatuses.RevisionRequired,
            var value when value.Equals(SalesOrderDesignStatuses.Rejected, StringComparison.OrdinalIgnoreCase) => SalesOrderDesignStatuses.Rejected,
            _ => throw new InvalidOperationException("Design status must be PendingDesign, WaitingApproval, Approved, RevisionRequired, or Rejected.")
        };
    }
}
