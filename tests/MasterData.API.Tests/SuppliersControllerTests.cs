using Microsoft.AspNetCore.Mvc;
using Moq;
using PJT_ERP.MasterData.Api.Application.Catalog;
using PJT_ERP.MasterData.Api.Controllers;
using Xunit;

namespace MasterData.API.Tests;

public class SuppliersControllerTests
{
    private readonly Mock<ICatalogService> _catalogServiceMock;
    private readonly SuppliersController _controller;

    public SuppliersControllerTests()
    {
        _catalogServiceMock = new Mock<ICatalogService>();
        _controller = new SuppliersController(_catalogServiceMock.Object);
    }

    [Fact]
    public async Task List_ReturnsOkWithSuppliers()
    {
        // Arrange
        var expectedSuppliers = new List<SupplierDto>
        {
            new SupplierDto(Guid.NewGuid(), "SUP-001", "Test Supplier", "PT", "Raw Material", "Jakarta", null, null, "Active", null, null, null, null, null, null, 4.5, new List<SupplierContactDto>(), DateTime.UtcNow, DateTime.UtcNow)
        };

        _catalogServiceMock
            .Setup(x => x.ListSuppliersAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(expectedSuppliers);

        // Act
        var result = await _controller.List(CancellationToken.None);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var returnedSuppliers = Assert.IsAssignableFrom<IReadOnlyCollection<SupplierDto>>(okResult.Value);
        Assert.Single(returnedSuppliers);
        Assert.Equal("Test Supplier", returnedSuppliers.First().Name);
    }

    [Fact]
    public async Task Create_ReturnsCreatedWithSupplier()
    {
        // Arrange
        var request = new CreateSupplierRequest("SUP-002", "Test Supplier 2", "CV", "Packaging", "Bandung", null, null, "Active", null, null, null, null, null, null, 5.0, new List<CreateSupplierContactRequest>());
        var createdSupplier = new SupplierDto(Guid.NewGuid(), "SUP-002", "Test Supplier 2", "CV", "Packaging", "Bandung", null, null, "Active", null, null, null, null, null, null, 5.0, new List<SupplierContactDto>(), DateTime.UtcNow, DateTime.UtcNow);

        _catalogServiceMock
            .Setup(x => x.CreateSupplierAsync(request, It.IsAny<CancellationToken>()))
            .ReturnsAsync(createdSupplier);

        // Act
        var result = await _controller.Create(request, CancellationToken.None);

        // Assert
        var createdResult = Assert.IsType<CreatedAtActionResult>(result.Result);
        Assert.Equal(nameof(_controller.List), createdResult.ActionName);
        var returnedSupplier = Assert.IsType<SupplierDto>(createdResult.Value);
        Assert.Equal("Test Supplier 2", returnedSupplier.Name);
    }
}
