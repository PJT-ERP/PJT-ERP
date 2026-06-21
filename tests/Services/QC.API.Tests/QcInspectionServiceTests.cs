using Microsoft.EntityFrameworkCore;
using PJT_ERP.EventBus.Messages.Events;
using PJT_ERP.QC.Api.Application.Inspections;
using PJT_ERP.QC.Api.Domain.Entities;
using PJT_ERP.QC.Api.Infrastructure.Persistence;
using PJT_ERP.Shared.Infrastructure.Messaging;

namespace QC.API.Tests;

public sealed class QcInspectionServiceTests
{
    private static readonly Guid ReviewerUserId = Guid.Parse("11111111-1111-1111-1111-111111111111");

    [Fact]
    public async Task UploadResultAsync_saves_image_notes_and_publishes_completion_event()
    {
        await using var db = CreateDbContext();
        var inspection = CreateReadyInspection();
        await db.QcInspections.AddAsync(inspection);
        await db.SaveChangesAsync();

        var eventPublisher = new RecordingEventPublisher();
        var service = new QcInspectionService(db, eventPublisher);

        var result = await service.UploadResultAsync(
            inspection.Id,
            new UploadQcResultRequest(
                ReviewerUserId,
                "Reviewer Engineer",
                ["https://drive.example/production-image.jpg"],
                ["https://drive.example/qc-image.jpg"],
                "Visual condition is acceptable.",
                "Go"),
            CancellationToken.None);

        Assert.NotNull(result);
        Assert.Equal(QcInspectionStatuses.Go, result.Status);
        Assert.Equal(QcInspectionStatuses.Go, result.Decision);
        Assert.Contains("https://drive.example/production-image.jpg", result.ProductionPhotos);
        Assert.Contains("https://drive.example/qc-image.jpg", result.QcPhotos);
        Assert.Equal("Visual condition is acceptable.", result.Notes);
        Assert.Equal(ReviewerUserId, result.ReviewedByUserId);
        Assert.Equal("Reviewer Engineer", result.ReviewerName);

        var completedEvent = Assert.Single(eventPublisher.PublishedEvents.OfType<QcCheckCompletedEvent>());
        Assert.Equal(inspection.Id, completedEvent.QcInspectionId);
        Assert.Equal(inspection.ProductionOrderId, completedEvent.ProductionOrderId);
        Assert.Equal(QcInspectionStatuses.Go, completedEvent.Decision);
    }

    [Fact]
    public async Task UploadResultAsync_saves_nogo_decision()
    {
        await using var db = CreateDbContext();
        var inspection = CreateReadyInspection();
        await db.QcInspections.AddAsync(inspection);
        await db.SaveChangesAsync();

        var eventPublisher = new RecordingEventPublisher();
        var service = new QcInspectionService(db, eventPublisher);

        var result = await service.UploadResultAsync(
            inspection.Id,
            new UploadQcResultRequest(
                ReviewerUserId,
                "Reviewer Engineer",
                ["https://drive.example/production-image.jpg"],
                ["https://drive.example/qc-image.jpg"],
                "Diameter outside tolerance.",
                "NoGo"),
            CancellationToken.None);

        Assert.NotNull(result);
        Assert.Equal(QcInspectionStatuses.NoGo, result.Status);
        Assert.Equal(QcInspectionStatuses.NoGo, result.Decision);

        var completedEvent = Assert.Single(eventPublisher.PublishedEvents.OfType<QcCheckCompletedEvent>());
        Assert.Equal(QcInspectionStatuses.NoGo, completedEvent.Decision);
    }

    [Fact]
    public async Task UploadResultAsync_rejects_wrong_reviewer()
    {
        await using var db = CreateDbContext();
        var inspection = CreateReadyInspection();
        await db.QcInspections.AddAsync(inspection);
        await db.SaveChangesAsync();

        var service = new QcInspectionService(db, new RecordingEventPublisher());

        var exception = await Assert.ThrowsAsync<InvalidOperationException>(
            () => service.UploadResultAsync(
                inspection.Id,
                new UploadQcResultRequest(
                    Guid.Parse("99999999-9999-9999-9999-999999999999"),
                    "Other Reviewer",
                    ["https://drive.example/production-image.jpg"],
                    ["https://drive.example/qc-image.jpg"],
                    "Not assigned.",
                    "Go"),
                CancellationToken.None));

        Assert.Contains("assigned QC reviewer", exception.Message);
    }

    [Fact]
    public async Task UploadResultAsync_requires_finished_production()
    {
        await using var db = CreateDbContext();
        var inspection = CreateReadyInspection();
        inspection.Status = QcInspectionStatuses.WaitingProduction;
        await db.QcInspections.AddAsync(inspection);
        await db.SaveChangesAsync();

        var service = new QcInspectionService(db, new RecordingEventPublisher());

        var exception = await Assert.ThrowsAsync<InvalidOperationException>(
            () => service.UploadResultAsync(
                inspection.Id,
                new UploadQcResultRequest(
                    ReviewerUserId,
                    "Reviewer Engineer",
                    ["https://drive.example/production-image.jpg"],
                    ["https://drive.example/qc-image.jpg"],
                    null,
                    "Go"),
                CancellationToken.None));

        Assert.Contains("Production must be finished", exception.Message);
    }

    private static QcContext CreateDbContext()
    {
        var options = new DbContextOptionsBuilder<QcContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        return new QcContext(options);
    }

    private static QcInspection CreateReadyInspection()
    {
        return new QcInspection
        {
            RefNo = "QC-SO-001",
            ProductionOrderId = Guid.Parse("22222222-2222-2222-2222-222222222222"),
            SpkNumber = "SO-001",
            BarcodeUid = "PJT|SO|20260517|0001",
            ProductName = "Shaft Diameter 20mm",
            ProductCode = "PART-001",
            PorNumber = "SO-001",
            DrawingRef = "SO-001",
            OrderQty = 10,
            MaterialSpec = "S45C",
            AssignedReviewerUserId = ReviewerUserId,
            AssignedReviewerName = "Reviewer Engineer",
            Status = QcInspectionStatuses.ReadyForInspection
        };
    }

    private sealed class RecordingEventPublisher : IEventPublisher
    {
        public List<IntegrationEvent> PublishedEvents { get; } = [];

        public Task PublishAsync(IntegrationEvent integrationEvent, CancellationToken cancellationToken = default)
        {
            PublishedEvents.Add(integrationEvent);
            return Task.CompletedTask;
        }
    }
}
