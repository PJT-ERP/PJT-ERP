using Microsoft.EntityFrameworkCore;
using Moq;
using PJT_ERP.EventBus.Messages.Events;
using PJT_ERP.MasterData.Api.Application.Catalog;
using PJT_ERP.MasterData.Api.Domain.Entities;
using PJT_ERP.MasterData.Api.Infrastructure.Persistence;
using PJT_ERP.Shared.Infrastructure.Messaging;
using Xunit;

namespace MasterData.API.Tests;

public class CatalogServiceTests
{
    private readonly MasterDataContext _context;
    private readonly Mock<IEventPublisher> _eventPublisherMock;
    private readonly CatalogService _catalogService;

    public CatalogServiceTests()
    {
        var options = new DbContextOptionsBuilder<MasterDataContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        _context = new MasterDataContext(options);
        _eventPublisherMock = new Mock<IEventPublisher>();

        _catalogService = new CatalogService(_context, _eventPublisherMock.Object);
    }

    [Fact]
    public async Task CreateSupplierAsync_ValidRequest_SavesToDatabaseAndPublishesEvent()
    {
        // Arrange
        var request = new CreateSupplierRequest("SUP-001", "Test Supplier", "PT", "Raw Material", "Jakarta", null, null, "Active", null, null, null, null, null, null, 4.5, new List<CreateSupplierContactRequest>());

        // Act
        var result = await _catalogService.CreateSupplierAsync(request, CancellationToken.None);

        // Assert
        Assert.NotNull(result);
        Assert.Equal("SUP-001", result.Code);
        Assert.Equal("Test Supplier", result.Name);

        // Verify database
        var savedSupplier = await _context.Suppliers.FirstOrDefaultAsync(s => s.Code == "SUP-001");
        Assert.NotNull(savedSupplier);

        // Verify event was published
        _eventPublisherMock.Verify(x => x.PublishAsync(
            It.Is<MasterDataUpdatedEvent>(e => e.Code == "SUP-001" && e.EntityType == "Supplier"),
            It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task ListSuppliersAsync_ReturnsSuppliersOrderedByCode()
    {
        // Arrange
        _context.Suppliers.AddRange(
            new Supplier { Id = Guid.NewGuid(), Code = "SUP-B", Name = "Supplier B", Type = "PT", Category = "Cat" },
            new Supplier { Id = Guid.NewGuid(), Code = "SUP-A", Name = "Supplier A", Type = "CV", Category = "Cat" }
        );
        await _context.SaveChangesAsync();

        // Act
        var result = await _catalogService.ListSuppliersAsync(CancellationToken.None);

        // Assert
        Assert.Equal(2, result.Count);
        Assert.Equal("SUP-A", result.First().Code);
        Assert.Equal("SUP-B", result.Last().Code);
    }
}
