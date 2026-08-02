using Microsoft.EntityFrameworkCore;
using PJT_ERP.EventBus.Messages.Events;
using PJT_ERP.Production.Api.Domain.Entities;
using PJT_ERP.Production.Api.Infrastructure.Persistence;
using PJT_ERP.Shared.Infrastructure.Messaging;

namespace PJT_ERP.Production.Api.Application.Production;

public abstract partial class ProductionServiceBase
{
    protected async Task<SalesOrder?> FindSalesOrderByTrackingCodeAsync(
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

    protected static SalesOrderDto ToDto(SalesOrder order)
    {
        return ToDto(order, null);
    }

    protected static SalesOrderDto ToDto(SalesOrder order, IReadOnlyCollection<BomStockDto>? boms)
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
            productionOrder?.CompletionNote,
            order.EstimatedAmount,
            order.IsCostingCompleted,
            order.DesignRevisions.OrderBy(r => r.Version).Select(r => new SalesOrderDesignRevisionDto(r.Version, r.Url, r.ChangedBy, r.ChangedAtUtc)).ToArray(),
            order.Items.OrderBy(item => item.ProductPartNumber).Select(ToDto).ToArray(),
            order.ProductionPhotos,
            order.QcPhotos,
            MapMaterials(order, boms));
    }

    private static IReadOnlyCollection<SalesOrderMaterialDto>? MapMaterials(SalesOrder order, IReadOnlyCollection<BomStockDto>? boms)
    {
        if (boms == null || boms.Count == 0) return null;

        var materialsByKey = new Dictionary<string, SalesOrderMaterialDto>();
        var legacyMaterials = new List<SalesOrderMaterialDto>();

        foreach (var item in order.Items)
        {
            var productBom = boms.FirstOrDefault(b => b.ProductId == item.ProductId);
            
            if (item.Notes != null && item.Notes.StartsWith("["))
            {
                try
                {
                    using var doc = System.Text.Json.JsonDocument.Parse(item.Notes);
                    if (doc.RootElement.ValueKind == System.Text.Json.JsonValueKind.Array)
                    {
                        int index = 0;
                        foreach (var element in doc.RootElement.EnumerateArray())
                        {
                            var legacy = new SalesOrderMaterialDto(
                                element.GetProperty("id").GetString() ?? $"{item.Id}-legacy-{index}",
                                element.TryGetProperty("inventoryItemId", out var invIdProp) ? invIdProp.GetString() : null,
                                element.GetProperty("name").GetString() ?? "",
                                element.TryGetProperty("code", out var codeProp) ? codeProp.GetString() : null,
                                element.TryGetProperty("spec", out var specProp) ? specProp.GetString() : null,
                                element.TryGetProperty("specification", out var specificationProp) ? specificationProp.GetString() : null,
                                element.TryGetProperty("quantity", out var qtyProp) ? (qtyProp.ValueKind == System.Text.Json.JsonValueKind.Number ? qtyProp.GetInt32() : (int.TryParse(qtyProp.GetString(), out int q) ? q : 0)) : 0,
                                element.TryGetProperty("unit", out var unitProp) ? unitProp.GetString() ?? "" : ""
                            );
                            legacyMaterials.Add(legacy);
                            index++;
                        }
                    }
                }
                catch
                {
                    // Ignore parsing errors for legacy notes
                }
            }

            var overriddenInventoryItemIds = new HashSet<string>();
            foreach (var legacy in legacyMaterials)
            {
                var resolvedInvId = legacy.InventoryItemId ?? legacy.Id;
                if (!string.IsNullOrEmpty(resolvedInvId) && !resolvedInvId.Contains("-legacy-"))
                {
                    overriddenInventoryItemIds.Add(resolvedInvId);
                }
            }
            
            if (productBom?.Items != null)
            {
                foreach (var bomItem in productBom.Items)
                {
                    if (overriddenInventoryItemIds.Contains(bomItem.InventoryItemId.ToString()))
                    {
                        continue;
                    }

                    var specVal = bomItem.Spec ?? "";
                    var specKey = specVal != "" ? specVal : (bomItem.InventoryItemCode ?? "");
                    var key = $"{bomItem.InventoryItemId}|{specKey}|{bomItem.Unit}";
                    var quantity = (int)(bomItem.BomQuantity * Math.Max(item.Qty, 1));
                    
                    if (materialsByKey.TryGetValue(key, out var existing))
                    {
                        materialsByKey[key] = existing with { Quantity = existing.Quantity + quantity };
                    }
                    else
                    {
                        materialsByKey[key] = new SalesOrderMaterialDto(
                            $"{item.Id}-{bomItem.BomItemId}",
                            bomItem.InventoryItemId.ToString(),
                            bomItem.InventoryItemName,
                            bomItem.InventoryItemCode,
                            specVal,
                            specVal,
                            quantity,
                            bomItem.Unit
                        );
                    }
                }
            }
        }
        
        foreach (var legacy in legacyMaterials)
        {
            var resolvedInvId = legacy.InventoryItemId ?? legacy.Id;
            var specKey = legacy.Spec ?? legacy.Specification ?? "";
            var key = $"{resolvedInvId}|{specKey}|{legacy.Unit}";
            
            if (materialsByKey.TryGetValue(key, out var existing))
            {
                materialsByKey[key] = existing with { Quantity = existing.Quantity + legacy.Quantity };
            }
            else
            {
                materialsByKey[key] = legacy;
            }
        }

        var results = materialsByKey.Values.ToList();
        return results.Count > 0 ? results : null;
    }

    protected static SalesOrderItemDto ToDto(SalesOrderItem item)
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

    protected static SalesOrderProductionProgressDto ToProgressDto(SalesOrder order)
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
            productionOrder?.CompletionNote,
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

    protected static PublicProductionTrackingDto ToPublicTrackingDto(SalesOrder order)
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

    protected static decimal CalculateProgressPercent(SalesOrder order, ProductionOrder? prodOrder)
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

    protected static long? CalculateDurationSeconds(ProductionOrder order)
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

    protected static bool IsQcGo(string? decision)
    {
        return decision is not null
            && (decision.Equals("Go", StringComparison.OrdinalIgnoreCase)
                || decision.Equals("Approved", StringComparison.OrdinalIgnoreCase)
                || decision.Equals("Approve", StringComparison.OrdinalIgnoreCase)
                || decision.Equals("Pass", StringComparison.OrdinalIgnoreCase));
    }

    protected static bool IsQcNoGo(string? decision)
    {
        return decision is not null
            && (decision.Equals("NoGo", StringComparison.OrdinalIgnoreCase)
                || decision.Equals("No Go", StringComparison.OrdinalIgnoreCase)
                || decision.Equals("Rejected", StringComparison.OrdinalIgnoreCase)
                || decision.Equals("Reject", StringComparison.OrdinalIgnoreCase)
                || decision.Equals("Fail", StringComparison.OrdinalIgnoreCase));
    }

    protected static IQueryable<SalesOrder> IncludeProduction(IQueryable<SalesOrder> query)
    {
        return query
            .Include(order => order.Items)
            .Include(order => order.ProductionOrders);
    }

    protected static ProductionOrder? GetPrimaryProductionOrder(SalesOrder salesOrder)
    {
        return salesOrder.ProductionOrders
            .OrderBy(order => order.CreatedAtUtc)
            .FirstOrDefault();
    }

    protected static void ValidateSalesOrderItems(IReadOnlyCollection<CreateSalesOrderItemRequest> items)
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

    protected static EngineerAssignment? NormalizeAssignment(EngineerAssignment? assignment, string label)
    {
        if (assignment is null)
        {
            return null;
        }

        if (assignment.UserId == Guid.Empty)
        {
            // Allow unassigning by passing an empty Guid. The Name will be ignored or set to null.
            return assignment with { Name = null };
        }

        if (string.IsNullOrWhiteSpace(assignment.Name))
        {
            throw new InvalidOperationException($"{label} name is required.");
        }

        return assignment with { Name = assignment.Name.Trim() };
    }

    protected static void ApplyAssignment(SalesOrder salesOrder, AssignSalesOrderEngineersRequest request)
    {
        var designWorker = NormalizeAssignment(request.DesignWorker, "Design worker");
        var productionWorker = NormalizeAssignment(request.ProductionWorker, "Production worker");
        var qcReviewer = NormalizeAssignment(request.QcReviewer, "QC reviewer");

        if (designWorker is not null)
        {
            salesOrder.DesignWorkerUserId = designWorker.UserId == Guid.Empty ? null : designWorker.UserId;
            salesOrder.DesignWorkerName = designWorker.UserId == Guid.Empty ? null : designWorker.Name;
        }

        if (productionWorker is not null)
        {
            salesOrder.ProductionWorkerUserId = productionWorker.UserId == Guid.Empty ? null : productionWorker.UserId;
            salesOrder.ProductionWorkerName = productionWorker.UserId == Guid.Empty ? null : productionWorker.Name;
        }

        if (qcReviewer is not null)
        {
            salesOrder.QcReviewerUserId = qcReviewer.UserId == Guid.Empty ? null : qcReviewer.UserId;
            salesOrder.QcReviewerName = qcReviewer.UserId == Guid.Empty ? null : qcReviewer.Name;
        }

        if (!string.IsNullOrWhiteSpace(request.Notes))
        {
            salesOrder.RejectionReason = request.Notes;
        }
    }

    protected static void EnsureEngineersAssigned(SalesOrder salesOrder)
    {
        // Workflow change: MR is now submitted by SPV before penugasan operator.
        // Therefore, we no longer require production worker or QC reviewer to be assigned
        // before the sales order can be confirmed.
    }

    protected static void EnsureDesignApproved(SalesOrder salesOrder)
    {
        if (salesOrder.DesignStatus != SalesOrderDesignStatuses.Approved)
        {
            throw new InvalidOperationException("Sales order design must be approved before the sales order is confirmed.");
        }
    }

    protected static void ValidateWorkerRequest(ProductionStatusUpdateRequest request)
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

    protected static void ValidateDrawingUploadRequest(UploadEngineeringDrawingRequest request)
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

    protected static void ValidateMaterialRequest(SubmitProductionMaterialRequest request)
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

    protected static void EnsureAssignedWorker(Guid? assignedWorkerId, Guid workerUserId, bool isPrivileged = false, string roleName = "worker")
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
            throw new InvalidOperationException($"Only the assigned {roleName} can perform this action.");
        }
    }

    protected static void StartProduction(ProductionOrder productionOrder, ProductionStatusUpdateRequest request, DateTime timestampUtc)
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

    protected static void FinishProduction(ProductionOrder productionOrder, ProductionStatusUpdateRequest request, DateTime timestampUtc)
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
        if (!string.IsNullOrWhiteSpace(request.Reason))
        {
            productionOrder.CompletionNote = request.Reason.Trim();
        }
        productionOrder.UpdatedAtUtc = timestampUtc;
    }

    protected static void PauseProduction(ProductionOrder productionOrder, ProductionStatusUpdateRequest request, DateTime timestampUtc)
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

    protected static void ResumeProduction(ProductionOrder productionOrder, ProductionStatusUpdateRequest request, DateTime timestampUtc)
    {
        if (productionOrder.Status != ProductionOrderStatuses.Paused)
        {
            throw new InvalidOperationException("Only paused production can be resumed.");
        }

        productionOrder.Status = ProductionOrderStatuses.InProgress;
        productionOrder.PauseReason = null;
        productionOrder.UpdatedAtUtc = timestampUtc;
    }

    protected static SalesOrderConfirmedItem[] BuildConfirmedItems(SalesOrder salesOrder)
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

    protected static SpkCreatedItem[] BuildSpkItems(SalesOrder salesOrder)
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

    protected static string? NormalizeOptional(string? value)
    {
        return string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    }

    protected static string? NormalizeOptionalUrl(string? value, string label)
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

    protected static Guid? NormalizeSalesOrderItemId(Guid? salesOrderItemId)
    {
        return salesOrderItemId == Guid.Empty ? null : salesOrderItemId;
    }

    protected static string NormalizeMaterialRequestUrgency(string? urgency)
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

    protected static string? NormalizeMaterialRequestCategory(string? category)
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

    protected static string NormalizeDesignStatus(string? status)
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
