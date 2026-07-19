using PJT_ERP.EventBus.Messages.Events;
using PJT_ERP.Production.Api.Application.Production;
using PJT_ERP.Production.Api.Infrastructure.Persistence;
using PJT_ERP.Shared.Infrastructure.Messaging;
using PJT_ERP.Production.Api.Domain.Entities;
using System.Threading;
using System.Threading.Tasks;
using System.Collections.Generic;
using System;

namespace Production.API.Tests
{
    public class ProductionService
    {
        private readonly SalesOrderCommandService _salesOrderCmd;
        private readonly ProductionCommandService _productionCmd;
        private readonly ProductionQueryService _productionQuery;

        public ProductionService(ProductionContext db, IEventPublisher publisher, IMasterDataClient masterDataClient)
        {
            _salesOrderCmd = new SalesOrderCommandService(db, publisher, masterDataClient);
            _productionCmd = new ProductionCommandService(db, publisher, masterDataClient);
            _productionQuery = new ProductionQueryService(db, publisher, masterDataClient);
        }

        public Task<SalesOrderDto> CreateSalesOrderAsync(CreateSalesOrderRequest request, CancellationToken cancellationToken)
            => _salesOrderCmd.CreateSalesOrderAsync(request, cancellationToken);

        public Task<SalesOrderProductionProgressDto?> ConfirmSalesOrderAsync(Guid salesOrderId, ConfirmSalesOrderRequest request, CancellationToken cancellationToken)
            => _salesOrderCmd.ConfirmSalesOrderAsync(salesOrderId, request, cancellationToken);

        public Task<SalesOrderDto?> UpdateSalesOrderDesignStatusAsync(Guid salesOrderId, UpdateSalesOrderDesignStatusRequest request, CancellationToken cancellationToken, bool isPrivileged = false)
            => _salesOrderCmd.UpdateSalesOrderDesignStatusAsync(salesOrderId, request, cancellationToken);

        public Task<SalesOrderProductionProgressDto?> StartProductionAsync(Guid salesOrderId, ProductionStatusUpdateRequest request, CancellationToken cancellationToken, bool isPrivileged = false)
            => _productionCmd.StartProductionAsync(salesOrderId, request, cancellationToken, isPrivileged);

        public Task<SalesOrderProductionProgressDto?> PauseProductionAsync(Guid salesOrderId, ProductionStatusUpdateRequest request, CancellationToken cancellationToken, bool isPrivileged = false)
            => _productionCmd.PauseProductionAsync(salesOrderId, request, cancellationToken, isPrivileged);

        public Task<SalesOrderProductionProgressDto?> ResumeProductionAsync(Guid salesOrderId, ProductionStatusUpdateRequest request, CancellationToken cancellationToken, bool isPrivileged = false)
            => _productionCmd.ResumeProductionAsync(salesOrderId, request, cancellationToken, isPrivileged);

        public Task<SalesOrderProductionProgressDto?> FinishProductionAsync(Guid salesOrderId, ProductionStatusUpdateRequest request, CancellationToken cancellationToken, bool isPrivileged = false)
            => _productionCmd.FinishProductionAsync(salesOrderId, request, cancellationToken, isPrivileged);

        public Task<SalesOrderProductionProgressDto?> UploadEngineeringDrawingAsync(Guid salesOrderId, UploadEngineeringDrawingRequest request, CancellationToken cancellationToken = default)
            => _productionCmd.UploadEngineeringDrawingAsync(salesOrderId, request, cancellationToken);

        public Task<SalesOrderProductionProgressDto?> SubmitMaterialRequestAsync(Guid salesOrderId, SubmitProductionMaterialRequest request, CancellationToken cancellationToken)
            => _productionCmd.SubmitMaterialRequestAsync(salesOrderId, request, cancellationToken);

        public Task<SalesOrderProductionProgressDto?> GetSalesOrderTrackingByCodeAsync(string barcodeUid, CancellationToken cancellationToken)
            => _productionQuery.GetSalesOrderTrackingByCodeAsync(barcodeUid, cancellationToken);

        public Task<PublicProductionTrackingDto?> GetPublicTrackingAsync(string soNumber, CancellationToken cancellationToken)
            => _productionQuery.GetPublicTrackingAsync(soNumber, cancellationToken);

        public Task<SalesOrderDto?> SetSalesOrderPricingAsync(Guid salesOrderId, SetSalesOrderPricingRequest request, CancellationToken cancellationToken)
            => _salesOrderCmd.SetSalesOrderPricingAsync(salesOrderId, request, cancellationToken);
    }
}

