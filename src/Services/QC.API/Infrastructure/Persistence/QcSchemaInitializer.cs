using Microsoft.EntityFrameworkCore;

namespace PJT_ERP.QC.Api.Infrastructure.Persistence;

public static class QcSchemaInitializer
{
    public static async Task EnsureQcSchemaAsync(this QcContext db, CancellationToken cancellationToken = default)
    {
        await db.Database.EnsureCreatedAsync(cancellationToken);

        // Dev-friendly schema evolution until formal EF migrations are introduced.
        await db.Database.ExecuteSqlRawAsync(
            """
            ALTER TABLE qc_inspections ADD COLUMN IF NOT EXISTS assigned_reviewer_user_id uuid;
            ALTER TABLE qc_inspections ADD COLUMN IF NOT EXISTS assigned_reviewer_name character varying(160);
            ALTER TABLE qc_inspections ADD COLUMN IF NOT EXISTS qc_image_url character varying(1000);
            ALTER TABLE qc_inspections ADD COLUMN IF NOT EXISTS notes text;
            ALTER TABLE qc_inspections ADD COLUMN IF NOT EXISTS decision character varying(40);
            ALTER TABLE qc_inspections ADD COLUMN IF NOT EXISTS reviewed_by_user_id uuid;
            ALTER TABLE qc_inspections ADD COLUMN IF NOT EXISTS reviewer_name character varying(160);
            ALTER TABLE qc_inspections ADD COLUMN IF NOT EXISTS reviewed_at_utc timestamp with time zone;

            DO $$
            BEGIN
                IF EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name = 'qc_inspections' AND column_name = 'owner_decision'
                ) THEN
                    EXECUTE '
                        UPDATE qc_inspections
                        SET notes = COALESCE(notes, defect_notes, form_remarks),
                            decision = COALESCE(decision, owner_decision),
                            reviewed_by_user_id = COALESCE(reviewed_by_user_id, owner_reviewed_by_user_id),
                            reviewer_name = COALESCE(reviewer_name, owner_reviewer_name),
                            reviewed_at_utc = COALESCE(reviewed_at_utc, owner_reviewed_at_utc)';
                END IF;
            END $$;
            """,
            cancellationToken);
    }
}
