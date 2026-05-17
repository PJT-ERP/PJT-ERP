using Microsoft.EntityFrameworkCore;
using PJT_HIMTIKA.EventBus.Messages.Events;
using PJT_HIMTIKA.Purchasing.Api.Domain.Entities;
using PJT_HIMTIKA.Purchasing.Api.Infrastructure.Persistence;
using PJT_HIMTIKA.Shared.Infrastructure.Messaging;

namespace PJT_HIMTIKA.Purchasing.Api.Application.PurchaseRequests;

public sealed class PurchaseRequestService(PurchasingContext db, IEventPublisher eventPublisher) : IPurchaseRequestService
{
    public async Task<IReadOnlyCollection<PurchaseRequestDto>> ListAsync(CancellationToken cancellationToken)
    {
        var requests = await db.PurchaseRequests
            .AsNoTracking()
            .Include(request => request.Items)
            .OrderByDescending(request => request.CreatedAtUtc)
            .ToListAsync(cancellationToken);

        return requests.Select(ToDto).ToArray();
    }

    public async Task<PurchaseRequestDto> CreateAsync(CreatePurchaseRequest request, CancellationToken cancellationToken)
    {
        if (request.Items.Count == 0)
        {
            throw new InvalidOperationException("Purchase request must contain at least one item.");
        }

        var purchaseRequest = new PurchaseRequest
        {
            PrNumber = GenerateNumber(),
            RequestDate = request.RequestDate,
            RequestedByUserId = request.RequestedByUserId,
            RequesterName = request.RequesterName,
            Status = PurchaseRequestStatuses.Submitted,
            Items = request.Items.Select(item => new PurchaseRequestItem
            {
                ItemName = item.ItemName,
                Size = item.Size,
                Qty = item.Qty,
                SuggestedSupplier = item.SuggestedSupplier,
                Notes = item.Notes
            }).ToList()
        };

        await db.PurchaseRequests.AddAsync(purchaseRequest, cancellationToken);
        await db.SaveChangesAsync(cancellationToken);
        return ToDto(purchaseRequest);
    }

    public async Task<PurchaseRequestDto?> ReviewAsync(Guid id, ReviewPurchaseRequest request, CancellationToken cancellationToken)
    {
        var purchaseRequest = await db.PurchaseRequests
            .Include(item => item.Items)
            .FirstOrDefaultAsync(item => item.Id == id, cancellationToken);

        if (purchaseRequest is null)
        {
            return null;
        }

        purchaseRequest.Status = request.Decision.Equals("Approve", StringComparison.OrdinalIgnoreCase)
            ? PurchaseRequestStatuses.Approved
            : PurchaseRequestStatuses.Rejected;
        purchaseRequest.ReviewedByUserId = request.ReviewedByUserId;
        purchaseRequest.ReviewedAtUtc = DateTime.UtcNow;
        purchaseRequest.RejectionReason = purchaseRequest.Status == PurchaseRequestStatuses.Rejected ? request.RejectionReason : null;
        purchaseRequest.UpdatedAtUtc = DateTime.UtcNow;

        await eventPublisher.PublishAsync(
            new PurchaseRequestReviewedEvent(purchaseRequest.Id, purchaseRequest.PrNumber, purchaseRequest.Status, purchaseRequest.ReviewedAtUtc.Value),
            cancellationToken);
        await db.SaveChangesAsync(cancellationToken);
        return ToDto(purchaseRequest);
    }

    private static PurchaseRequestDto ToDto(PurchaseRequest request)
    {
        return new PurchaseRequestDto(
            request.Id,
            request.PrNumber,
            request.RequestDate,
            request.RequestedByUserId,
            request.RequesterName,
            request.Status,
            request.ReviewedByUserId,
            request.ReviewedAtUtc,
            request.RejectionReason,
            request.UpdatedAtUtc,
            request.Items.Select(item => new PurchaseRequestItemDto(
                item.Id,
                item.ItemName,
                item.Size,
                item.Qty,
                item.SuggestedSupplier,
                item.Notes)).ToArray());
    }

    private static string GenerateNumber()
    {
        return $"PR-{DateTime.UtcNow:yyyyMMddHHmmss}-{Guid.NewGuid():N}"[..27].ToUpperInvariant();
    }
}
