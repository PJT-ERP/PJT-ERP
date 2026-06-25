using Microsoft.EntityFrameworkCore;
using PJT_ERP.Production.Api.Application.Analytics;
using PJT_ERP.Production.Api.Domain.Entities;
using PJT_ERP.Production.Api.Infrastructure.Persistence;

namespace Production.API.Tests;

public sealed class AnalyticsServiceTests
{
    private static ProductionContext CreateDbContext()
    {
        var options = new DbContextOptionsBuilder<ProductionContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        return new ProductionContext(options);
    }

    [Fact]
    public async Task GetOwnerDashboardAsync_calculates_correct_weekly_performance_and_kpis()
    {
        // Arrange
        await using var db = CreateDbContext();
        
        var so1 = new SalesOrder
        {
            Id = Guid.NewGuid(),
            CustomerId = Guid.NewGuid(),
            CustomerCode = "C-001",
            SoNumber = "SO-001",
            Status = "Completed",
            CreatedAtUtc = DateTime.UtcNow.AddDays(-10),
            UpdatedAtUtc = DateTime.UtcNow.AddDays(-2),
            Items = []
        };
        var so2 = new SalesOrder
        {
            Id = Guid.NewGuid(),
            CustomerId = Guid.NewGuid(),
            CustomerCode = "C-002",
            SoNumber = "SO-002",
            Status = "InProduction",
            CreatedAtUtc = DateTime.UtcNow.AddDays(-5),
            Items = []
        };
        
        // Accepted production order
        var po1 = new ProductionOrder
        {
            Id = Guid.NewGuid(),
            SalesOrderId = so1.Id,
            SalesOrderItemId = Guid.NewGuid(),
            PoNumber = "PO-001",
            DrawingRef = "D-001",
            BarcodeUid = "B-001",
            Status = "Finished",
            StartedAtUtc = DateTime.UtcNow.AddDays(-3).AddHours(-4), // 4 hours diff
            FinishedAtUtc = DateTime.UtcNow.AddDays(-3),
            UpdatedAtUtc = DateTime.UtcNow.AddDays(-3),
            QcDecision = "Go"
        };
        // Rejected production order
        var po2 = new ProductionOrder
        {
            Id = Guid.NewGuid(),
            SalesOrderId = so1.Id,
            SalesOrderItemId = Guid.NewGuid(),
            PoNumber = "PO-002",
            DrawingRef = "D-002",
            BarcodeUid = "B-002",
            Status = "Finished",
            StartedAtUtc = DateTime.UtcNow.AddDays(-3).AddHours(-2), // 2 hours diff
            FinishedAtUtc = DateTime.UtcNow.AddDays(-3),
            UpdatedAtUtc = DateTime.UtcNow.AddDays(-3),
            QcDecision = "NoGo"
        };

        so1.ProductionOrders.Add(po1);
        so1.ProductionOrders.Add(po2);

        await db.SalesOrders.AddRangeAsync(so1, so2);
        await db.ProductionOrders.AddRangeAsync(po1, po2);
        await db.SaveChangesAsync();

        var service = new AnalyticsService(db);

        // Act
        var dashboard = await service.GetOwnerDashboardAsync(CancellationToken.None);

        // Assert
        Assert.NotNull(dashboard);
        
        // Sales Orders
        Assert.NotNull(dashboard.SalesOrders);
        Assert.Equal(1, dashboard.SalesOrders.Done);
        Assert.Equal(1, dashboard.SalesOrders.InProgress);

        // Quality Control metrics
        Assert.NotNull(dashboard.QualityControl);
        Assert.Equal(1, dashboard.QualityControl.Accept);
        Assert.Equal(1, dashboard.QualityControl.Reject);
        Assert.Equal(0, dashboard.QualityControl.Scrap);

        // Weekly performance check
        Assert.NotEmpty(dashboard.WeeklyPerformance);
        
        // Find the week that matches (so1 was completed 2 days ago, which should fall into the current week or previous week)
        var hasWeekWithData = dashboard.WeeklyPerformance.Any(w => w.Completed > 0 || w.Rejected > 0 || w.AvgHours > 0);
        Assert.True(hasWeekWithData, "Expected at least one week to have data.");
    }
}
