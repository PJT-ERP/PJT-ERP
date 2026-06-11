using PJT_ERP.EventBus.Messages.Events;
using PJT_ERP.Purchasing.Api.Application.PurchaseRequests;
using PJT_ERP.Shared.Infrastructure.Messaging;

namespace PJT_ERP.Purchasing.Api.Application.IntegrationEvents;

public sealed class MaterialRequestSubmittedEventHandler(IPurchaseRequestService purchaseRequestService)
    : IIntegrationEventHandler<MaterialRequestSubmittedEvent>
{
    public async Task Handle(MaterialRequestSubmittedEvent integrationEvent, CancellationToken cancellationToken = default)
    {
        await purchaseRequestService.CreateAsync(
            new CreatePurchaseRequest(
                integrationEvent.RequestDate,
                integrationEvent.RequestedByUserId,
                integrationEvent.RequesterName,
                integrationEvent.SalesOrderId,
                integrationEvent.SalesOrderNumber,
                integrationEvent.ProjectName,
                integrationEvent.Items.Select(item => new CreatePurchaseRequestItem(
                    item.MaterialRequirementId,
                    integrationEvent.SalesOrderId,
                    integrationEvent.SalesOrderNumber,
                    integrationEvent.ProjectName,
                    item.ItemName,
                    item.Size,
                    item.Qty,
                    item.SuggestedSupplier,
                    item.Notes ?? integrationEvent.Notes,
                    item.Urgency,
                    item.PurchaseCategory))
                    .ToArray()),
            cancellationToken);
    }
}
