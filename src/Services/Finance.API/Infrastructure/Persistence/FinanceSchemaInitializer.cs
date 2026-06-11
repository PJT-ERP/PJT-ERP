using Microsoft.EntityFrameworkCore;
using PJT_ERP.Shared.Infrastructure.Persistence;

namespace PJT_ERP.Finance.Api.Infrastructure.Persistence;

public static class FinanceSchemaInitializer
{
    public static async Task EnsureFinanceSchemaAsync(this FinanceContext db, CancellationToken cancellationToken = default)
    {
        await db.Database.EnsureCreatedAsync(cancellationToken);

        // Dev-friendly schema evolution until formal EF migrations are introduced.
        await db.Database.ExecuteSqlRawAsync(
            """
            CREATE TABLE IF NOT EXISTS payment_verification_requests (
                id uuid NOT NULL PRIMARY KEY,
                invoice_id uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
                payment_date date NOT NULL,
                amount numeric(18,2) NOT NULL,
                bank_name character varying(120) NOT NULL,
                bank_reference character varying(120) NULL,
                proof_file_name character varying(255) NULL,
                proof_file_url text NULL,
                notes text NULL,
                status character varying(50) NOT NULL,
                submitted_by character varying(80) NOT NULL,
                submitted_at_utc timestamp with time zone NOT NULL,
                verified_by character varying(80) NULL,
                verified_at_utc timestamp with time zone NULL,
                rejection_reason text NULL,
                rejected_at_utc timestamp with time zone NULL
            );

            CREATE INDEX IF NOT EXISTS ix_payment_verification_requests_invoice_id
                ON payment_verification_requests (invoice_id);

            CREATE INDEX IF NOT EXISTS ix_payment_verification_requests_status
                ON payment_verification_requests (status);

            ALTER TABLE payment_verification_requests ADD COLUMN IF NOT EXISTS proof_file_url text;
            """,
            cancellationToken);

        await db.Database.ExecuteSeedSqlAsync(cancellationToken: cancellationToken);
    }
}
