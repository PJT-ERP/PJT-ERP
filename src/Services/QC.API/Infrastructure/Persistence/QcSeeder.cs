using Microsoft.EntityFrameworkCore;
using PJT_ERP.QC.Api.Domain.Entities;

namespace PJT_ERP.QC.Api.Infrastructure.Persistence;

public static class QcSeeder
{
    public static async Task SeedAsync(QcContext db, CancellationToken cancellationToken = default)
    {
        if (await db.QcInspections.AnyAsync(inspection => inspection.RefNo == "QC-DEV-001", cancellationToken))
        {
            return;
        }

        var now = DateTime.UtcNow;

        db.QcInspections.Add(new QcInspection
        {
            Id = Guid.Parse("60000000-0000-0000-0000-000000000001"),
            RefNo = "QC-DEV-001",
            ProductionOrderId = Guid.Parse("50000000-0000-0000-0000-000000000001"),
            SpkNumber = "PO-DEV-001",
            BarcodeUid = "BARCODE-DEV-001",
            ProductName = "Shaft Diameter 20mm",
            ProductCode = "PART-001",
            PorNumber = "PO-DEV-001",
            DrawingRef = "DRW-DEV-001",
            OrderQty = 10,
            MaterialSpec = "S45C",
            InspectionDate = DateOnly.FromDateTime(now),
            ProductionFinishedAtUtc = now,
            SampleQty = 3,
            SamplingMethod = "Random",
            MeasuringToolNo = "CAL-DEV-001",
            Status = QcInspectionStatuses.InInspection,
            CreatedAtUtc = now,
            UpdatedAtUtc = now,
            VisualChecks =
            [
                new QcVisualCheck
                {
                    CheckDate = DateOnly.FromDateTime(now),
                    QtyChecked = 3,
                    QtyAccept = 3,
                    Remarks = "Development seed visual check",
                    CreatedAtUtc = now,
                    UpdatedAtUtc = now
                }
            ],
            DimensionChecks =
            [
                new QcDimensionCheck
                {
                    CheckDate = DateOnly.FromDateTime(now),
                    SampleId = "SAMPLE-DEV-001",
                    Process = "Turning",
                    DimensionDataJson = """{"diameter_mm":20.0,"tolerance_mm":0.05}""",
                    OperatorName = "Dev Operator",
                    Status = "Passed",
                    CreatedAtUtc = now,
                    UpdatedAtUtc = now
                }
            ]
        });

        await db.SaveChangesAsync(cancellationToken);
    }
}
