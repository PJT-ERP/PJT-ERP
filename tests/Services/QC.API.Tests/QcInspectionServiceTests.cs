using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using PJT_HIMTIKA.EventBus.Messages.Events;
using PJT_HIMTIKA.QC.Api.Application.Inspections;
using PJT_HIMTIKA.QC.Api.Domain.Entities;
using PJT_HIMTIKA.QC.Api.Infrastructure.Persistence;
using PJT_HIMTIKA.Shared.Infrastructure.Messaging;

namespace QC.API.Tests;

public sealed class QcInspectionServiceTests
{
    [Fact]
    public async Task ScanAsync_finds_inspection_by_barcode()
    {
        await using var db = CreateDbContext();
        var inspection = CreateReadyInspection();
        await db.QcInspections.AddAsync(inspection);
        await db.SaveChangesAsync();

        var service = new QcInspectionService(db, new RecordingEventPublisher());

        var result = await service.ScanAsync(new ScanInspectionRequest(inspection.BarcodeUid), CancellationToken.None);

        Assert.NotNull(result);
        Assert.Equal(inspection.Id, result.Id);
        Assert.Equal("Shaft Diameter 20mm", result.ProductName);
    }

    [Fact]
    public async Task UploadFormAsync_requires_defect_notes_when_repair_is_submitted_for_review()
    {
        await using var db = CreateDbContext();
        var inspection = CreateReadyInspection();
        await db.QcInspections.AddAsync(inspection);
        await db.SaveChangesAsync();

        var service = new QcInspectionService(db, new RecordingEventPublisher());
        var request = CreateUploadFormRequest(
            inspectionResult: QcInspectionResults.Repair,
            defectNotes: null,
            submitForOwnerReview: true);

        var exception = await Assert.ThrowsAsync<InvalidOperationException>(
            () => service.UploadFormAsync(inspection.Id, request, CancellationToken.None));

        Assert.Contains("Defect notes are required", exception.Message);
    }

    [Fact]
    public async Task UploadFormAsync_saves_legacy_checksheet_data_and_waits_for_owner_review()
    {
        await using var db = CreateDbContext();
        var inspection = CreateReadyInspection();
        await db.QcInspections.AddAsync(inspection);
        await db.SaveChangesAsync();

        var eventPublisher = new RecordingEventPublisher();
        var service = new QcInspectionService(db, eventPublisher);
        var request = CreateUploadFormRequest(
            inspectionResult: QcInspectionResults.Accept,
            defectNotes: null,
            submitForOwnerReview: true);

        var result = await service.UploadFormAsync(inspection.Id, request, CancellationToken.None);

        Assert.NotNull(result);
        Assert.Equal(QcInspectionStatuses.PendingOwnerReview, result.Status);
        Assert.Equal(QcInspectionResults.Accept, result.InspectionResult);
        Assert.Equal("Shaft Diameter 20mm", result.ProductName);
        Assert.Equal("PART-001", result.ProductCode);
        Assert.Equal("DRW-001", result.DrawingRef);
        Assert.Equal("S45C", result.MaterialSpec);
        Assert.Equal("QC form completed by Owner.", result.FormRemarks);
        Assert.Single(result.VisualChecks);
        Assert.Single(result.DimensionChecks);
        Assert.Empty(eventPublisher.PublishedEvents);

        var persistedInspection = await db.QcInspections
            .Include(item => item.VisualChecks)
            .Include(item => item.DimensionChecks)
            .SingleAsync(item => item.Id == inspection.Id);

        Assert.Equal(QcInspectionStatuses.PendingOwnerReview, persistedInspection.Status);
        Assert.Single(persistedInspection.VisualChecks);
        Assert.Single(persistedInspection.DimensionChecks);
    }

    [Fact]
    public async Task ReviewAsync_approves_inspection_and_publishes_completion_event()
    {
        await using var db = CreateDbContext();
        var inspection = CreateReadyInspection();
        inspection.Status = QcInspectionStatuses.PendingOwnerReview;
        inspection.InspectionResult = QcInspectionResults.Accept;
        await db.QcInspections.AddAsync(inspection);
        await db.SaveChangesAsync();

        var eventPublisher = new RecordingEventPublisher();
        var service = new QcInspectionService(db, eventPublisher);

        var result = await service.ReviewAsync(
            inspection.Id,
            new ReviewInspectionRequest(
                Guid.Parse("11111111-1111-1111-1111-111111111111"),
                "Owner",
                "Approve",
                "Approved."),
            CancellationToken.None);

        Assert.NotNull(result);
        Assert.Equal(QcInspectionStatuses.Approved, result.Status);
        Assert.Equal(QcInspectionStatuses.Approved, result.OwnerDecision);

        var completedEvent = Assert.Single(eventPublisher.PublishedEvents.OfType<QcCheckCompletedEvent>());
        Assert.Equal(inspection.Id, completedEvent.QcInspectionId);
        Assert.Equal(inspection.ProductionOrderId, completedEvent.ProductionOrderId);
        Assert.Equal(QcInspectionStatuses.Approved, completedEvent.Decision);
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
            RefNo = "QC-SPK-001",
            ProductionOrderId = Guid.Parse("22222222-2222-2222-2222-222222222222"),
            SpkNumber = "SPK-001",
            BarcodeUid = "PJT|SPK|20260517|0001",
            ProductName = "Shaft Diameter 20mm",
            ProductCode = "PART-001",
            PorNumber = "SPK-001",
            DrawingRef = "DRW-OLD",
            OrderQty = 10,
            MaterialSpec = "S45C",
            Status = QcInspectionStatuses.ReadyForInspection
        };
    }

    private static UploadQcFormRequest CreateUploadFormRequest(
        string inspectionResult,
        string? defectNotes,
        bool submitForOwnerReview)
    {
        return new UploadQcFormRequest(
            Guid.Parse("33333333-3333-3333-3333-333333333333"),
            "Owner",
            DateOnly.FromDateTime(DateTime.UtcNow),
            3,
            "Random",
            "CAL-001",
            inspectionResult,
            defectNotes,
            "QC form completed by Owner.",
            submitForOwnerReview,
            [
                new CreateVisualCheckRequest(
                    10,
                    inspectionResult == QcInspectionResults.Accept ? 10 : 8,
                    0,
                    inspectionResult == QcInspectionResults.Accept ? 0 : 2,
                    0,
                    inspectionResult == QcInspectionResults.Accept ? null : "NC-001",
                    inspectionResult == QcInspectionResults.Accept ? null : "Needs repair.",
                    DateOnly.FromDateTime(DateTime.UtcNow))
            ],
            [
                new CreateDimensionCheckRequest(
                    "SAMPLE-001",
                    "Turning",
                    Json("""{"A":{"spec":"205","value":205.01}}"""),
                    Guid.Parse("44444444-4444-4444-4444-444444444444"),
                    "Operator 1",
                    inspectionResult,
                    DateOnly.FromDateTime(DateTime.UtcNow))
            ],
            "Shaft Diameter 20mm",
            "PART-001",
            "SPK-001",
            "DRW-001",
            10,
            "S45C");
    }

    private static JsonElement Json(string value)
    {
        using var document = JsonDocument.Parse(value);
        return document.RootElement.Clone();
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
