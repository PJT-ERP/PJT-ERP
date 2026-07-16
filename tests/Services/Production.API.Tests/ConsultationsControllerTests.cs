using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PJT_ERP.Production.Api.Application.Consultations;
using PJT_ERP.Production.Api.Controllers;
using PJT_ERP.Production.Api.Infrastructure.Persistence;
using PJT_ERP.Production.Api.Domain.Entities;
using Xunit;

namespace PJT_ERP.Production.API.Tests;

public class ConsultationsControllerTests : IDisposable
{
    private readonly ProductionContext _context;
    private readonly ConsultationsController _controller;

    public ConsultationsControllerTests()
    {
        var options = new DbContextOptionsBuilder<ProductionContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
            
        _context = new ProductionContext(options);
        _controller = new ConsultationsController(_context);
    }

    public void Dispose()
    {
        _context.Database.EnsureDeleted();
        _context.Dispose();
    }

    [Fact]
    public async Task SubmitConsultation_ValidRequest_CreatesConsultationAndReturnsOk()
    {
        // Arrange
        var request = new CreateConsultationRequest
        {
            Name = "John Doe",
            Phone = "1234567890",
            Email = "john@example.com",
            ServiceDescription = "Test Service",
            Message = "Test Message"
        };

        // Act
        var result = await _controller.SubmitConsultation(request);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result);
        var dto = Assert.IsType<ConsultationDto>(okResult.Value);
        Assert.Equal("John Doe", dto.Name);
        Assert.Equal("New", dto.Status);
        
        var dbCount = await _context.ConsultationRequests.CountAsync();
        Assert.Equal(1, dbCount);
    }

    [Fact]
    public async Task GetConsultations_ReturnsConsultationsSortedByDateDesc()
    {
        // Arrange
        var req1 = new ConsultationRequest { Name = "Old", CreatedAtUtc = DateTime.UtcNow.AddDays(-1) };
        var req2 = new ConsultationRequest { Name = "New", CreatedAtUtc = DateTime.UtcNow };
        _context.ConsultationRequests.AddRange(req1, req2);
        await _context.SaveChangesAsync();

        // Act
        var result = await _controller.GetConsultations();

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result);
        var list = Assert.IsAssignableFrom<System.Collections.Generic.IEnumerable<ConsultationDto>>(okResult.Value);
        var array = System.Linq.Enumerable.ToArray(list);
        
        Assert.Equal(2, array.Length);
        Assert.Equal("New", array[0].Name); // Newest first
    }

    [Fact]
    public async Task UpdateStatus_ValidId_UpdatesStatusAndReturnsNoContent()
    {
        // Arrange
        var req = new ConsultationRequest { Name = "Test", Status = "New" };
        _context.ConsultationRequests.Add(req);
        await _context.SaveChangesAsync();

        var updateReq = new UpdateConsultationStatusRequest { Status = "Contacted" };

        // Act
        var result = await _controller.UpdateStatus(req.Id, updateReq);

        // Assert
        Assert.IsType<NoContentResult>(result);
        
        var updatedReq = await _context.ConsultationRequests.FindAsync(req.Id);
        Assert.Equal("Contacted", updatedReq.Status);
    }

    [Fact]
    public async Task UpdateStatus_InvalidId_ReturnsNotFound()
    {
        // Act
        var result = await _controller.UpdateStatus(Guid.NewGuid(), new UpdateConsultationStatusRequest { Status = "Contacted" });

        // Assert
        Assert.IsType<NotFoundResult>(result);
    }
}
