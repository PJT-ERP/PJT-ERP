using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using PJT_ERP.Production.Api.Application.Production;
using PJT_ERP.Production.Api.Domain.Entities;
using PJT_ERP.Production.Api.Infrastructure.Persistence;
using PJT_ERP.Shared.Infrastructure.Messaging;
using PJT_ERP.EventBus.Messages.Events;
using Xunit;

namespace Production.API.Tests;

public sealed class ProductionMasterDataFallbackTests
{
    [Fact]
    public async Task CreateCompleteSalesOrder_should_fallback_when_MasterData_throws_exception()
    {
        // ── Arrange ──────────────────────────────────────────────────────────
        var options = new DbContextOptionsBuilder<ProductionContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        await using var db = new ProductionContext(options);
        await db.Database.EnsureCreatedAsync();

        var eventPublisher = new StubPublisher();
        var stubMasterDataClient = new FaultyMasterDataClient();

        var service = new SalesOrderCommandService(db, eventPublisher, stubMasterDataClient);

        // A CompleteSalesOrderRequest simulating a custom product with extensive BOM (MaterialSpec)
        var request = new CompleteSalesOrderRequest(
            Customer: new CompleteSalesOrderCustomerRequest("CUST-009", "PT. Test Long BOM", null, null, null, null),
            Products: new[]
            {
                new CompleteSalesOrderProductRequest(
                    "temp_0", 
                    "Extremely complex product", 
                    "pcs", 
                    new string('X', 500) // Simulates a JSON structure exceeding 255 chars
                )
            },
            Order: new CompleteSalesOrderDetailsRequest(
                DateOnly.FromDateTime(DateTime.UtcNow),
                DateOnly.FromDateTime(DateTime.UtcNow.AddDays(7)),
                new[]
                {
                    new CompleteSalesOrderItemRequest("temp_0", null, 10, 50000m, new string('Y', 1500), null, null) // Simulates extensive notes exceeding 1000 chars
                },
                new EngineerAssignment(Guid.NewGuid(), "Design Worker"),
                new EngineerAssignment(Guid.NewGuid(), "Production Worker"),
                new EngineerAssignment(Guid.NewGuid(), "QC Reviewer"),
                null,
                null,
                "PendingDesign"
            )
        );

        // ── Act ──────────────────────────────────────────────────────────────
        // If the fallbacks are not implemented or length limits trigger a crash, this will throw an exception
        var result = await service.CreateCompleteSalesOrderAsync(request, CancellationToken.None);

        // ── Assert ───────────────────────────────────────────────────────────
        Assert.NotNull(result);
        Assert.NotEmpty(result.SoNumber);

        // Verify fallback CustomerReplica was created successfully
        var customerReplica = await db.CustomerReplicas.FirstOrDefaultAsync(c => c.Code == "CUST-009");
        Assert.NotNull(customerReplica);
        Assert.Equal("PT. Test Long BOM", customerReplica.Name);

        // Verify fallback ProductReplica was created successfully (starting with TMP-)
        var productReplica = await db.ProductReplicas.FirstOrDefaultAsync();
        Assert.NotNull(productReplica);
        Assert.StartsWith("TMP-", productReplica.PartNumber);
        Assert.Equal("Extremely complex product", productReplica.Description);
        
        // Verify SalesOrderItem was successfully persisted with the >1000 char Notes field
        var orderItem = await db.SalesOrderItems.FirstOrDefaultAsync();
        Assert.NotNull(orderItem);
        Assert.True(orderItem.Notes?.Length > 1000);
    }

    [Fact]
    public async Task CreateCompleteSalesOrder_should_save_replica_when_MasterData_succeeds_despite_GetCustomer_failing()
    {
        // ── Arrange ──────────────────────────────────────────────────────────
        var options = new DbContextOptionsBuilder<ProductionContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        await using var db = new ProductionContext(options);
        await db.Database.EnsureCreatedAsync();

        var eventPublisher = new StubPublisher();
        
        // This client succeeds in Create, but returns null in Get (simulating race condition / latency)
        var latentMasterDataClient = new LatentMasterDataClient();

        var service = new SalesOrderCommandService(db, eventPublisher, latentMasterDataClient);

        var request = new CompleteSalesOrderRequest(
            Customer: new CompleteSalesOrderCustomerRequest("", "PT. Success Flow", null, null, null, null),
            Products: new[]
            {
                new CompleteSalesOrderProductRequest("temp_0", "Successful product", "pcs", null)
            },
            Order: new CompleteSalesOrderDetailsRequest(
                DateOnly.FromDateTime(DateTime.UtcNow),
                DateOnly.FromDateTime(DateTime.UtcNow.AddDays(7)),
                new[] { new CompleteSalesOrderItemRequest("temp_0", null, 10, 50000m, null, null, null) },
                null, null, null, null, null, "PendingDesign"
            )
        );

        // ── Act ──────────────────────────────────────────────────────────────
        var result = await service.CreateCompleteSalesOrderAsync(request, CancellationToken.None);

        // ── Assert ───────────────────────────────────────────────────────────
        Assert.NotNull(result);
        
        // The customer code in the sales order should be the generated code from the Create endpoint, 
        // not fallback to "CUST-UNKNOWN" or become empty.
        Assert.Equal("CUST-SUCCESS", result.CustomerCode);
        
        var orderItem = result.Items.First();
        Assert.Equal("PART-SUCCESS", orderItem.ProductPartNumber);

        // Verify the replicas were saved
        var customerReplica = await db.CustomerReplicas.FirstOrDefaultAsync(c => c.Name == "PT. Success Flow");
        Assert.NotNull(customerReplica);
        Assert.Equal("CUST-SUCCESS", customerReplica.Code);

        var productReplica = await db.ProductReplicas.FirstOrDefaultAsync(p => p.Description == "Successful product");
        Assert.NotNull(productReplica);
        Assert.Equal("PART-SUCCESS", productReplica.PartNumber);
    }

    [Fact]
    public async Task CreateCompleteSalesOrder_should_fallback_to_generated_code_when_customer_code_is_empty_and_masterdata_throws_exception()
    {
        // ── Arrange ──────────────────────────────────────────────────────────
        var options = new DbContextOptionsBuilder<ProductionContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        await using var db = new ProductionContext(options);
        await db.Database.EnsureCreatedAsync();

        var eventPublisher = new StubPublisher();
        var stubMasterDataClient = new FaultyMasterDataClient();

        var service = new SalesOrderCommandService(db, eventPublisher, stubMasterDataClient);

        // A CompleteSalesOrderRequest simulating "Pelanggan Baru" where customer code is empty
        var request = new CompleteSalesOrderRequest(
            Customer: new CompleteSalesOrderCustomerRequest("", "PT. Pelanggan Baru", null, null, null, null),
            Products: new[]
            {
                new CompleteSalesOrderProductRequest(
                    "temp_0", 
                    "Standard product", 
                    "pcs", 
                    "Specs"
                )
            },
            Order: new CompleteSalesOrderDetailsRequest(
                DateOnly.FromDateTime(DateTime.UtcNow),
                DateOnly.FromDateTime(DateTime.UtcNow.AddDays(7)),
                new[]
                {
                    new CompleteSalesOrderItemRequest("temp_0", null, 10, 50000m, "Notes", null, null)
                },
                new EngineerAssignment(Guid.NewGuid(), "Design Worker"),
                new EngineerAssignment(Guid.NewGuid(), "Production Worker"),
                new EngineerAssignment(Guid.NewGuid(), "QC Reviewer"),
                null,
                null,
                "PendingDesign"
            )
        );

        // ── Act ──────────────────────────────────────────────────────────────
        var result = await service.CreateCompleteSalesOrderAsync(request, CancellationToken.None);

        // ── Assert ───────────────────────────────────────────────────────────
        Assert.NotNull(result);
        
        // The customer code in the sales order should fallback to a locally generated string like CUST-20240101010101
        Assert.False(string.IsNullOrWhiteSpace(result.CustomerCode), "Customer code should not be empty");
        Assert.StartsWith("CUST-", result.CustomerCode);
        
        // Verify the replica was saved with the non-empty code
        var customerReplica = await db.CustomerReplicas.FirstOrDefaultAsync(c => c.Name == "PT. Pelanggan Baru");
        Assert.NotNull(customerReplica);
        Assert.False(string.IsNullOrWhiteSpace(customerReplica.Code));
        Assert.StartsWith("CUST-", customerReplica.Code);
    }

    private sealed class StubPublisher : IEventPublisher
    {
        public Task PublishAsync(IntegrationEvent @event, CancellationToken cancellationToken = default) => Task.CompletedTask;
    }

    private sealed class LatentMasterDataClient : IMasterDataClient
    {
        public Task<MasterDataCustomerDto?> GetCustomerAsync(Guid id, CancellationToken cancellationToken) => Task.FromResult<MasterDataCustomerDto?>(null);
        public Task<MasterDataProductDto?> GetProductAsync(Guid id, CancellationToken cancellationToken) => Task.FromResult<MasterDataProductDto?>(null);

        public Task<MasterDataCustomerDto> CreateCustomerAsync(CreateCustomerMasterDataRequest request, CancellationToken cancellationToken)
        {
            return Task.FromResult(new MasterDataCustomerDto(Guid.NewGuid(), "CUST-SUCCESS", request.Name, request.Email, true));
        }

        public Task<MasterDataProductDto> CreateProductAsync(CreateProductMasterDataRequest request, CancellationToken cancellationToken)
        {
            return Task.FromResult(new MasterDataProductDto(Guid.NewGuid(), "PART-SUCCESS", request.Description, request.Unit, request.MaterialSpec, true));
        }

        public Task DeductBomStockAsync(Guid productId, int quantity, CancellationToken cancellationToken) => Task.CompletedTask;
        public Task DeductBomStockBulkAsync(System.Collections.Generic.IReadOnlyCollection<DeductBomStockRequestItem> items, string reason, CancellationToken cancellationToken) => Task.CompletedTask;
        public Task DeductCustomBomAsync(System.Collections.Generic.IReadOnlyCollection<DeductCustomBomRequestItem> items, string reason, CancellationToken cancellationToken) => Task.CompletedTask;
        public Task<System.Collections.Generic.IReadOnlyCollection<PJT_ERP.Production.Api.Application.Production.BomStockDto>> GetBomStockAsync(System.Collections.Generic.IEnumerable<Guid> itemIds, CancellationToken cancellationToken) => Task.FromResult<System.Collections.Generic.IReadOnlyCollection<PJT_ERP.Production.Api.Application.Production.BomStockDto>>(Array.Empty<PJT_ERP.Production.Api.Application.Production.BomStockDto>());
    }

    private sealed class FaultyMasterDataClient : IMasterDataClient
    {
        public Task<MasterDataCustomerDto?> GetCustomerAsync(Guid id, CancellationToken cancellationToken) => Task.FromResult<MasterDataCustomerDto?>(null);
        public Task<MasterDataProductDto?> GetProductAsync(Guid id, CancellationToken cancellationToken) => Task.FromResult<MasterDataProductDto?>(null);
        
        public Task<MasterDataCustomerDto> CreateCustomerAsync(CreateCustomerMasterDataRequest request, CancellationToken cancellationToken)
        {
            // Simulate 500 Internal Server Error when API rejects creation (e.g. unique constraint violation in MasterData)
            throw new Exception("Simulated HttpRequestException: 500 Internal Server Error");
        }

        public Task<MasterDataProductDto> CreateProductAsync(CreateProductMasterDataRequest request, CancellationToken cancellationToken)
        {
            // Simulate 500 Internal Server Error when API rejects creation (e.g. MaterialSpec > 255 chars)
            throw new Exception("Simulated HttpRequestException: 500 Internal Server Error");
        }

        public Task DeductBomStockAsync(Guid productId, int quantity, CancellationToken cancellationToken) => Task.CompletedTask;
        public Task DeductBomStockBulkAsync(System.Collections.Generic.IReadOnlyCollection<DeductBomStockRequestItem> items, string reason, CancellationToken cancellationToken) => Task.CompletedTask;
        public Task DeductCustomBomAsync(System.Collections.Generic.IReadOnlyCollection<DeductCustomBomRequestItem> items, string reason, CancellationToken cancellationToken) => Task.CompletedTask;
        public Task<System.Collections.Generic.IReadOnlyCollection<PJT_ERP.Production.Api.Application.Production.BomStockDto>> GetBomStockAsync(System.Collections.Generic.IEnumerable<Guid> itemIds, CancellationToken cancellationToken) => Task.FromResult<System.Collections.Generic.IReadOnlyCollection<PJT_ERP.Production.Api.Application.Production.BomStockDto>>(Array.Empty<PJT_ERP.Production.Api.Application.Production.BomStockDto>());
    }
}
