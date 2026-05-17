using Microsoft.EntityFrameworkCore;
using PJT_ERP.EventBus.Messages.Events;
using PJT_ERP.Production.Api.Domain.Entities;
using PJT_ERP.Production.Api.Infrastructure.Persistence;
using PJT_ERP.Shared.Infrastructure.Messaging;

namespace PJT_ERP.Production.Api.Application.Production;

public sealed class ProductionService(ProductionContext db, IEventPublisher eventPublisher) : IProductionService
{
    public async Task<IReadOnlyCollection<SalesOrderDto>> ListSalesOrdersAsync(CancellationToken cancellationToken)
    {
        var orders = await db.SalesOrders
            .AsNoTracking()
            .Include(order => order.Items)
            .OrderByDescending(order => order.CreatedAtUtc)
            .ToListAsync(cancellationToken);

        return orders.Select(ToDto).ToArray();
    }

    public async Task<SalesOrderDto> CreateSalesOrderAsync(CreateSalesOrderRequest request, CancellationToken cancellationToken)
    {
        if (request.Items.Count == 0)
        {
            throw new InvalidOperationException("Sales order must contain at least one item.");
        }

        var customer = await db.CustomerReplicas
            .AsNoTracking()
            .FirstOrDefaultAsync(replica => replica.Id == request.CustomerId && replica.IsActive, cancellationToken)
            ?? throw new InvalidOperationException("Customer has not been replicated from MasterData yet.");

        var productIds = request.Items.Select(item => item.ProductId).Distinct().ToArray();
        var products = await db.ProductReplicas
            .AsNoTracking()
            .Where(replica => productIds.Contains(replica.Id) && replica.IsActive)
            .ToDictionaryAsync(replica => replica.Id, cancellationToken);

        if (products.Count != productIds.Length)
        {
            throw new InvalidOperationException("One or more products have not been replicated from MasterData yet.");
        }

        var order = new SalesOrder
        {
            SoNumber = GenerateNumber("SO"),
            CustomerId = customer.Id,
            CustomerCode = customer.Code,
            CustomerName = customer.Name,
            SoDate = request.SoDate,
            TargetDate = request.TargetDate,
            Items = request.Items.Select(item =>
            {
                var product = products[item.ProductId];
                return new SalesOrderItem
                {
                    ProductId = product.Id,
                    ProductPartNumber = product.PartNumber,
                    ProductDescription = product.Description,
                    ProductMaterialSpec = product.MaterialSpec,
                    Qty = item.Qty,
                    Notes = item.Notes
                };
            }).ToList()
        };

        await db.SalesOrders.AddAsync(order, cancellationToken);
        await db.SaveChangesAsync(cancellationToken);
        return ToDto(order);
    }

    public async Task<IReadOnlyCollection<ProductionOrderDto>> ConfirmSalesOrderAsync(Guid salesOrderId, ConfirmSalesOrderRequest request, CancellationToken cancellationToken)
    {
        var salesOrder = await db.SalesOrders
            .Include(order => order.Items)
            .ThenInclude(item => item.ProductionOrders)
            .FirstOrDefaultAsync(order => order.Id == salesOrderId, cancellationToken)
            ?? throw new InvalidOperationException("Sales order was not found.");

        if (salesOrder.Status == SalesOrderStatuses.Cancelled)
        {
            throw new InvalidOperationException("Cancelled sales orders cannot be confirmed.");
        }

        salesOrder.Status = SalesOrderStatuses.InProduction;
        salesOrder.ApprovedByUserId = request.ApprovedByUserId;
        salesOrder.ApprovedAtUtc = DateTime.UtcNow;
        salesOrder.UpdatedAtUtc = DateTime.UtcNow;

        await eventPublisher.PublishAsync(
            new SalesOrderConfirmedEvent(salesOrder.Id, salesOrder.SoNumber, salesOrder.CustomerId, DateTime.UtcNow),
            cancellationToken);

        var createdOrders = new List<ProductionOrder>();
        foreach (var item in salesOrder.Items)
        {
            if (item.ProductionOrders.Count > 0)
            {
                continue;
            }

            var productionOrder = new ProductionOrder
            {
                SalesOrderItemId = item.Id,
                SalesOrderItem = item,
                PoNumber = GenerateNumber("SPK"),
                DrawingRef = item.ProductPartNumber,
                BarcodeUid = $"PJT|SPK|{DateTime.UtcNow:yyyyMMdd}|{item.Id:N}",
                OrderQty = item.Qty
            };
            await db.ProductionOrders.AddAsync(productionOrder, cancellationToken);
            createdOrders.Add(productionOrder);

            await eventPublisher.PublishAsync(
                new SpkCreatedEvent(
                    productionOrder.Id,
                    salesOrder.Id,
                    productionOrder.PoNumber,
                    productionOrder.BarcodeUid,
                    item.ProductId,
                    item.Qty,
                    item.ProductPartNumber,
                    item.ProductDescription,
                    productionOrder.DrawingRef,
                    item.ProductMaterialSpec),
                cancellationToken);
        }

        await db.SaveChangesAsync(cancellationToken);
        return createdOrders
            .Select(order =>
            {
                var item = salesOrder.Items.Single(salesOrderItem => salesOrderItem.Id == order.SalesOrderItemId);
                return ToDto(order, item, salesOrder);
            })
            .ToArray();
    }

    public async Task<SalesOrderProductionProgressDto?> GetSalesOrderProgressAsync(Guid salesOrderId, CancellationToken cancellationToken)
    {
        var salesOrder = await db.SalesOrders
            .AsNoTracking()
            .Include(order => order.Items)
            .ThenInclude(item => item.ProductionOrders)
            .FirstOrDefaultAsync(order => order.Id == salesOrderId, cancellationToken);

        return salesOrder is null ? null : ToProgressDto(salesOrder);
    }

    public async Task<PublicProductionTrackingDto?> GetPublicTrackingAsync(string trackingCode, CancellationToken cancellationToken)
    {
        var normalizedTrackingCode = trackingCode.Trim();
        if (string.IsNullOrWhiteSpace(normalizedTrackingCode))
        {
            throw new InvalidOperationException("Tracking code is required.");
        }

        var salesOrder = await db.SalesOrders
            .AsNoTracking()
            .Include(order => order.Items)
            .ThenInclude(item => item.ProductionOrders)
            .FirstOrDefaultAsync(
                order =>
                    order.SoNumber == normalizedTrackingCode
                    || order.Items.Any(item =>
                        item.ProductionOrders.Any(productionOrder =>
                            productionOrder.PoNumber == normalizedTrackingCode
                            || productionOrder.BarcodeUid == normalizedTrackingCode)),
                cancellationToken);

        return salesOrder is null ? null : ToPublicTrackingDto(salesOrder);
    }

    public async Task<IReadOnlyCollection<ProductionOrderDto>> ListProductionOrdersAsync(Guid? salesOrderId, CancellationToken cancellationToken)
    {
        var query = IncludeSalesOrder(db.ProductionOrders.AsNoTracking());
        if (salesOrderId.HasValue)
        {
            query = query.Where(order => order.SalesOrderItem != null && order.SalesOrderItem.SalesOrderId == salesOrderId.Value);
        }

        var orders = await query
            .AsNoTracking()
            .OrderByDescending(order => order.CreatedAtUtc)
            .ToListAsync(cancellationToken);

        return orders.Select(ToDto).ToArray();
    }

    public async Task<ProductionOrderDto?> GetProductionOrderAsync(Guid productionOrderId, CancellationToken cancellationToken)
    {
        var productionOrder = await IncludeSalesOrder(db.ProductionOrders.AsNoTracking())
            .FirstOrDefaultAsync(order => order.Id == productionOrderId, cancellationToken);

        return productionOrder is null ? null : ToDto(productionOrder);
    }

    public async Task<ProductionOrderDto?> GetProductionOrderByBarcodeAsync(string barcodeUid, CancellationToken cancellationToken)
    {
        var scannedValue = barcodeUid.Trim();
        if (string.IsNullOrWhiteSpace(scannedValue))
        {
            throw new InvalidOperationException("Barcode or QR value is required.");
        }

        var productionOrder = await IncludeSalesOrder(db.ProductionOrders.AsNoTracking())
            .FirstOrDefaultAsync(
                order => order.BarcodeUid == scannedValue || order.PoNumber == scannedValue,
                cancellationToken);

        return productionOrder is null ? null : ToDto(productionOrder);
    }

    public async Task<ProductionOrderDto?> UploadEngineeringDrawingAsync(
        Guid productionOrderId,
        UploadEngineeringDrawingRequest request,
        CancellationToken cancellationToken)
    {
        var productionOrder = await db.ProductionOrders
            .FirstOrDefaultAsync(order => order.Id == productionOrderId, cancellationToken);

        if (productionOrder is null)
        {
            return null;
        }

        if (!Uri.TryCreate(request.DrawingFileUrl.Trim(), UriKind.Absolute, out var drawingUri)
            || drawingUri.Scheme is not ("http" or "https"))
        {
            throw new InvalidOperationException("Drawing file URL must be a valid HTTP or HTTPS link.");
        }

        if (string.IsNullOrWhiteSpace(request.UploaderName))
        {
            throw new InvalidOperationException("Uploader name is required.");
        }

        productionOrder.DrawingFileUrl = drawingUri.ToString();
        productionOrder.DrawingUploadedByUserId = request.UploadedByUserId;
        productionOrder.DrawingUploaderName = request.UploaderName.Trim();
        productionOrder.DrawingUploadedAtUtc = DateTime.UtcNow;
        productionOrder.DrawingRef = string.IsNullOrWhiteSpace(request.DrawingRef)
            ? productionOrder.DrawingRef
            : request.DrawingRef.Trim();
        productionOrder.UpdatedAtUtc = DateTime.UtcNow;

        await db.SaveChangesAsync(cancellationToken);
        return await GetProductionOrderAsync(productionOrder.Id, cancellationToken);
    }

    public async Task<ProductionOrderDto?> ScanAsync(ScanProductionOrderRequest request, CancellationToken cancellationToken)
    {
        var scannedValue = request.BarcodeUid.Trim();
        if (string.IsNullOrWhiteSpace(scannedValue))
        {
            throw new InvalidOperationException("Barcode or QR value is required.");
        }

        var productionOrder = await IncludeSalesOrder(db.ProductionOrders)
            .FirstOrDefaultAsync(
                order => order.BarcodeUid == scannedValue || order.PoNumber == scannedValue,
                cancellationToken);

        if (productionOrder is null)
        {
            return null;
        }

        var action = NormalizeScanAction(request.Action);
        var now = DateTime.UtcNow;
        if (action == ScanActions.Start)
        {
            StartProduction(productionOrder, now);
        }
        else if (action == ScanActions.Complete)
        {
            var wasAlreadyFinished = productionOrder.FinishedAtUtc.HasValue;
            CompleteProduction(productionOrder, now);
            if (!wasAlreadyFinished)
            {
                await eventPublisher.PublishAsync(
                    new ProductionFinishedEvent(productionOrder.Id, productionOrder.PoNumber, productionOrder.BarcodeUid, productionOrder.FinishedAtUtc!.Value),
                    cancellationToken);
            }
        }

        productionOrder.UpdatedAtUtc = now;
        await db.SaveChangesAsync(cancellationToken);
        return ToDto(productionOrder);
    }

    public async Task<ExecutiveDashboardDto> GetExecutiveDashboardAsync(CancellationToken cancellationToken)
    {
        var orders = await db.ProductionOrders.AsNoTracking().ToListAsync(cancellationToken);
        var approved = orders.Count(order => order.QcDecision == "Approved");
        var rejected = orders.Count(order => order.QcDecision == "Rejected");
        var reviewedOrders = approved + rejected;
        var rejectionRate = reviewedOrders == 0 ? 0 : decimal.Round((decimal)rejected / reviewedOrders * 100, 2);

        return new ExecutiveDashboardDto(
            orders.Count(order => order.Status == ProductionOrderStatuses.Waiting),
            orders.Count(order => order.Status == ProductionOrderStatuses.InProgress),
            orders.Count(order => order.Status == ProductionOrderStatuses.Finished),
            orders.Count(order => order.Status == ProductionOrderStatuses.Closed),
            approved,
            rejected,
            rejectionRate);
    }

    private static SalesOrderDto ToDto(SalesOrder order)
    {
        return new SalesOrderDto(
            order.Id,
            order.SoNumber,
            order.CustomerId,
            order.CustomerCode,
            order.CustomerName,
            order.SoDate,
            order.TargetDate,
            order.Status,
            order.CreatedAtUtc,
            order.UpdatedAtUtc,
            order.Items.Select(item => new SalesOrderItemDto(
                item.Id,
                item.ProductId,
                item.ProductPartNumber,
                item.ProductDescription,
                item.Qty,
                item.Notes)).ToArray());
    }

    private static ProductionOrderDto ToDto(ProductionOrder order)
    {
        return ToDto(order, order.SalesOrderItem, order.SalesOrderItem?.SalesOrder);
    }

    private static ProductionOrderDto ToDto(ProductionOrder order, SalesOrderItem? item, SalesOrder? salesOrder)
    {
        return new ProductionOrderDto(
            order.Id,
            order.PoNumber,
            order.SalesOrderItemId,
            item?.SalesOrderId,
            salesOrder?.SoNumber,
            salesOrder?.CustomerCode,
            salesOrder?.CustomerName,
            item?.ProductId,
            item?.ProductPartNumber,
            item?.ProductDescription,
            order.DrawingRef,
            order.DrawingFileUrl,
            order.DrawingUploadedByUserId,
            order.DrawingUploaderName,
            order.DrawingUploadedAtUtc,
            order.BarcodeUid,
            order.OrderQty,
            order.Status,
            order.StartedAtUtc,
            order.FinishedAtUtc,
            CalculateDurationSeconds(order),
            order.QcDecision,
            order.UpdatedAtUtc);
    }

    private static SalesOrderProductionProgressDto ToProgressDto(SalesOrder order)
    {
        var productionOrders = order.Items.SelectMany(item => item.ProductionOrders).ToArray();
        var finishedOrders = productionOrders.Count(IsProductionFinished);
        var progressPercent = productionOrders.Length == 0
            ? 0
            : decimal.Round((decimal)finishedOrders / productionOrders.Length * 100, 2);

        return new SalesOrderProductionProgressDto(
            order.Id,
            order.SoNumber,
            order.CustomerCode,
            order.CustomerName,
            order.Status,
            order.Items.Count,
            order.Items.Sum(item => item.Qty),
            productionOrders.Length,
            productionOrders.Count(productionOrder => productionOrder.Status == ProductionOrderStatuses.Waiting),
            productionOrders.Count(productionOrder => productionOrder.Status == ProductionOrderStatuses.InProgress),
            productionOrders.Count(productionOrder => productionOrder.Status == ProductionOrderStatuses.Finished),
            productionOrders.Count(productionOrder => productionOrder.Status == ProductionOrderStatuses.Closed),
            progressPercent,
            order.Items
                .OrderBy(item => item.ProductPartNumber)
                .Select(item => new SalesOrderProductionProgressItemDto(
                    item.Id,
                    item.ProductId,
                    item.ProductPartNumber,
                    item.ProductDescription,
                    item.Qty,
                    item.ProductionOrders
                        .OrderBy(productionOrder => productionOrder.PoNumber)
                        .Select(productionOrder => ToDto(productionOrder, item, order))
                        .ToArray()))
                .ToArray());
    }

    private static PublicProductionTrackingDto ToPublicTrackingDto(SalesOrder order)
    {
        var productionOrders = order.Items.SelectMany(item => item.ProductionOrders).ToArray();
        var finishedOrders = productionOrders.Count(IsProductionFinished);
        var progressPercent = productionOrders.Length == 0
            ? 0
            : decimal.Round((decimal)finishedOrders / productionOrders.Length * 100, 2);
        var updatedAtUtc = productionOrders.Length == 0
            ? order.UpdatedAtUtc
            : productionOrders.Max(productionOrder => productionOrder.UpdatedAtUtc) > order.UpdatedAtUtc
                ? productionOrders.Max(productionOrder => productionOrder.UpdatedAtUtc)
                : order.UpdatedAtUtc;

        return new PublicProductionTrackingDto(
            order.SoNumber,
            order.CustomerName,
            order.Status,
            order.Items.Count,
            order.Items.Sum(item => item.Qty),
            productionOrders.Length,
            productionOrders.Count(productionOrder => productionOrder.Status == ProductionOrderStatuses.Waiting),
            productionOrders.Count(productionOrder => productionOrder.Status == ProductionOrderStatuses.InProgress),
            productionOrders.Count(productionOrder => productionOrder.Status == ProductionOrderStatuses.Finished),
            productionOrders.Count(productionOrder => productionOrder.Status == ProductionOrderStatuses.Closed),
            progressPercent,
            updatedAtUtc,
            order.Items
                .OrderBy(item => item.ProductPartNumber)
                .Select(item => new PublicProductionTrackingItemDto(
                    item.ProductPartNumber,
                    item.ProductDescription,
                    item.Qty,
                    item.ProductionOrders
                        .OrderBy(productionOrder => productionOrder.PoNumber)
                        .Select(productionOrder => new PublicProductionOrderTrackingDto(
                            productionOrder.PoNumber,
                            item.ProductPartNumber,
                            item.ProductDescription,
                            productionOrder.OrderQty,
                            productionOrder.Status,
                            productionOrder.StartedAtUtc,
                            productionOrder.FinishedAtUtc,
                            CalculateDurationSeconds(productionOrder),
                            productionOrder.UpdatedAtUtc))
                        .ToArray()))
                .ToArray());
    }

    private static bool IsProductionFinished(ProductionOrder order)
    {
        return order.Status == ProductionOrderStatuses.Finished
            || order.Status == ProductionOrderStatuses.Closed
            || order.FinishedAtUtc.HasValue;
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

    private static IQueryable<ProductionOrder> IncludeSalesOrder(IQueryable<ProductionOrder> query)
    {
        return query
            .Include(order => order.SalesOrderItem)
            .ThenInclude(item => item!.SalesOrder);
    }

    private static string NormalizeScanAction(string action)
    {
        if (string.IsNullOrWhiteSpace(action))
        {
            throw new InvalidOperationException("Scan action must be Start or Complete.");
        }

        if (action.Equals(ScanActions.Start, StringComparison.OrdinalIgnoreCase))
        {
            return ScanActions.Start;
        }

        if (action.Equals(ScanActions.Complete, StringComparison.OrdinalIgnoreCase)
            || action.Equals("Finish", StringComparison.OrdinalIgnoreCase))
        {
            return ScanActions.Complete;
        }

        throw new InvalidOperationException("Scan action must be Start or Complete.");
    }

    private static void StartProduction(ProductionOrder productionOrder, DateTime timestampUtc)
    {
        if (productionOrder.Status == ProductionOrderStatuses.Closed)
        {
            throw new InvalidOperationException("Closed production orders cannot be changed.");
        }

        if (productionOrder.Status == ProductionOrderStatuses.Finished)
        {
            throw new InvalidOperationException("Finished production orders cannot be started again.");
        }

        productionOrder.Status = ProductionOrderStatuses.InProgress;
        productionOrder.StartedAtUtc ??= timestampUtc;
    }

    private static void CompleteProduction(ProductionOrder productionOrder, DateTime timestampUtc)
    {
        if (productionOrder.Status == ProductionOrderStatuses.Closed)
        {
            throw new InvalidOperationException("Closed production orders cannot be changed.");
        }

        if (!productionOrder.StartedAtUtc.HasValue || productionOrder.Status == ProductionOrderStatuses.Waiting)
        {
            throw new InvalidOperationException("Production must be started before it can be completed.");
        }

        productionOrder.Status = ProductionOrderStatuses.Finished;
        productionOrder.FinishedAtUtc ??= timestampUtc;
    }

    private static string GenerateNumber(string prefix)
    {
        return $"{prefix}-{DateTime.UtcNow:yyyyMMddHHmmss}-{Guid.NewGuid():N}"[..(prefix.Length + 24)].ToUpperInvariant();
    }

    private static class ScanActions
    {
        public const string Start = "Start";
        public const string Complete = "Complete";
    }
}
