using Microsoft.EntityFrameworkCore;
using PJT_ERP.Production.Api.Application.Production;
using PJT_ERP.Production.Api.Domain.Entities;
using PJT_ERP.Production.Api.Infrastructure.Persistence;
using PJT_ERP.Shared.Infrastructure.Messaging;
using PJT_ERP.EventBus.Messages.Events;
using PJT_ERP.Production.Api.Application.IntegrationEvents;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using System;
using Xunit;

namespace Production.API.Tests;

public class SalesOrderCommentsTests
{
    private static readonly Guid CustomerId = Guid.Parse("11111111-1111-1111-1111-111111111111");
    private static readonly Guid ProductId = Guid.Parse("22222222-2222-2222-2222-222222222222");

    [Fact]
    public async Task AddComment_AddsCommentToSalesOrder()
    {
        await using var db = CreateDbContext();
        var eventPublisher = new RecordingEventPublisher();
        var service = new SalesOrderCommandService(db, eventPublisher, new StubMasterDataClient());

        var so = await CreateTestSalesOrder(db);

        var request = new AddSalesOrderCommentRequest(
            UserId: Guid.NewGuid(),
            UserName: "Test User",
            Content: "This is a test comment"
        );

        var result = await service.AddCommentAsync(so.Id, request, CancellationToken.None);

        Assert.NotNull(result);
        Assert.Equal(request.Content, result.Content);
        Assert.Equal(request.UserName, result.UserName);

        var savedSo = await db.SalesOrders.Include(s => s.Comments).FirstAsync(s => s.Id == so.Id);
        Assert.Single(savedSo.Comments);
        Assert.Equal(request.Content, savedSo.Comments[0].Content);
    }

    [Fact]
    public async Task UpdateComment_UpdatesContentAndFlagsAsEdited()
    {
        await using var db = CreateDbContext();
        var eventPublisher = new RecordingEventPublisher();
        var service = new SalesOrderCommandService(db, eventPublisher, new StubMasterDataClient());

        var so = await CreateTestSalesOrder(db);
        var comment = new SalesOrderComment
        {
            Id = Guid.NewGuid(),
            SalesOrderId = so.Id,
            UserId = Guid.NewGuid(),
            UserName = "Test User",
            Content = "Original content",
            CreatedAtUtc = DateTime.UtcNow
        };
        db.SalesOrderComments.Add(comment);
        await db.SaveChangesAsync();

        var request = new UpdateSalesOrderCommentRequest(
            Content: "Updated content"
        );

        var result = await service.UpdateCommentAsync(so.Id, comment.Id, request, CancellationToken.None);

        Assert.True(result);
        
        var updatedComment = await db.SalesOrderComments.FindAsync(comment.Id);
        Assert.Equal("Updated content", updatedComment.Content);
        Assert.True(updatedComment.IsEdited);
    }

    [Fact]
    public async Task DeleteComment_FlagsAsDeletedAndClearsContent()
    {
        await using var db = CreateDbContext();
        var eventPublisher = new RecordingEventPublisher();
        var service = new SalesOrderCommandService(db, eventPublisher, new StubMasterDataClient());

        var so = await CreateTestSalesOrder(db);
        var comment = new SalesOrderComment
        {
            Id = Guid.NewGuid(),
            SalesOrderId = so.Id,
            UserId = Guid.NewGuid(),
            UserName = "Test User",
            Content = "To be deleted",
            CreatedAtUtc = DateTime.UtcNow
        };
        db.SalesOrderComments.Add(comment);
        await db.SaveChangesAsync();

        var result = await service.DeleteCommentAsync(so.Id, comment.Id, CancellationToken.None);

        Assert.True(result);
        
        var deletedComment = await db.SalesOrderComments.FindAsync(comment.Id);
        Assert.Equal("[deleted message]", deletedComment.Content);
        Assert.True(deletedComment.IsDeleted);
    }

    private async Task<SalesOrder> CreateTestSalesOrder(ProductionContext db)
    {
        var so = new SalesOrder
        {
            Id = Guid.NewGuid(),
            SoNumber = "SO-TEST",
            CustomerId = CustomerId,
            CustomerName = "Test Customer",
            Status = SalesOrderStatuses.Draft,
            CreatedAtUtc = DateTime.UtcNow
        };
        db.SalesOrders.Add(so);
        await db.SaveChangesAsync();
        return so;
    }

    private static ProductionContext CreateDbContext()
    {
        var options = new DbContextOptionsBuilder<ProductionContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new ProductionContext(options);
    }

    private sealed class RecordingEventPublisher : IEventPublisher
    {
        public System.Collections.Generic.List<IntegrationEvent> PublishedEvents { get; } = [];
        public Task PublishAsync(IntegrationEvent e, CancellationToken ct = default) { PublishedEvents.Add(e); return Task.CompletedTask; }
    }

    private sealed class StubMasterDataClient : IMasterDataClient
    {
        public System.Collections.Generic.List<Guid> RequestedCustomerIds { get; } = [];
        public System.Collections.Generic.List<Guid> RequestedProductIds { get; } = [];
        public Task<MasterDataCustomerDto> CreateCustomerAsync(CreateCustomerMasterDataRequest request, CancellationToken ct) => Task.FromResult(new MasterDataCustomerDto(Guid.NewGuid(), request.Code, request.Name, request.Email, true));
        public Task<MasterDataProductDto> CreateProductAsync(CreateProductMasterDataRequest request, CancellationToken ct) => Task.FromResult(new MasterDataProductDto(Guid.NewGuid(), request.PartNumber, request.Description, request.Unit, request.MaterialSpec, true));
        public Task<MasterDataCustomerDto?> GetCustomerAsync(Guid id, CancellationToken ct) { RequestedCustomerIds.Add(id); return Task.FromResult<MasterDataCustomerDto?>(new MasterDataCustomerDto(id, "CUST-HTTP", "PT HTTP", "http@test.com", true)); }
        public Task<MasterDataProductDto?> GetProductAsync(Guid id, CancellationToken ct) { RequestedProductIds.Add(id); return Task.FromResult<MasterDataProductDto?>(new MasterDataProductDto(id, "PART-HTTP", "HTTP Desc", "pcs", "HTTP Spec", true)); }
        public Task DeductBomStockAsync(Guid productId, int quantity, CancellationToken ct) => Task.CompletedTask;
        public Task DeductBomStockBulkAsync(System.Collections.Generic.IReadOnlyCollection<DeductBomStockRequestItem> items, string reason, CancellationToken cancellationToken) => Task.CompletedTask;
        public Task DeductCustomBomAsync(System.Collections.Generic.IReadOnlyCollection<DeductCustomBomRequestItem> items, string reason, CancellationToken cancellationToken) => Task.CompletedTask;
        public Task<System.Collections.Generic.IReadOnlyCollection<BomStockDto>> GetBomStockAsync(System.Collections.Generic.IEnumerable<Guid> productIds, CancellationToken cancellationToken) => Task.FromResult<System.Collections.Generic.IReadOnlyCollection<BomStockDto>>(productIds.Select(id => new BomStockDto(id, "PART", "PARTNAME", new System.Collections.Generic.List<BomStockItemDto> { new BomStockItemDto(id, id, null, "INV", 1m, "kg", null, 100, "") })).ToArray());
    }
}
