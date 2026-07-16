using Microsoft.EntityFrameworkCore;
using PJT_ERP.Finance.Api.Domain.Entities;
using PJT_ERP.Shared.Infrastructure.Abstractions;
using PJT_ERP.Shared.Infrastructure.Messaging;

namespace PJT_ERP.Finance.Api.Infrastructure.Persistence;

public sealed class FinanceContext(DbContextOptions<FinanceContext> options) : DbContext(options), IUnitOfWork
{
    public DbSet<InvoiceCandidate> InvoiceCandidates => Set<InvoiceCandidate>();
    public DbSet<InvoiceCandidateItem> InvoiceCandidateItems => Set<InvoiceCandidateItem>();
    public DbSet<Invoice> Invoices => Set<Invoice>();
    public DbSet<InvoiceItem> InvoiceItems => Set<InvoiceItem>();
    public DbSet<PaymentSchedule> PaymentSchedules => Set<PaymentSchedule>();
    public DbSet<PaymentRecord> PaymentRecords => Set<PaymentRecord>();
    public DbSet<PaymentVerificationRequest> PaymentVerificationRequests => Set<PaymentVerificationRequest>();
    public DbSet<CollectionLetter> CollectionLetters => Set<CollectionLetter>();
    public DbSet<SupplierPayment> SupplierPayments => Set<SupplierPayment>();
    public DbSet<FinanceSetting> Settings => Set<FinanceSetting>();
    public DbSet<OutboxMessage> OutboxMessages => Set<OutboxMessage>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<InvoiceCandidate>(builder =>
        {
            builder.ToTable("invoice_candidates");
            builder.HasKey(candidate => candidate.SalesOrderId);
            builder.HasIndex(candidate => candidate.SalesOrderNumber).IsUnique();
            builder.HasIndex(candidate => candidate.CustomerId);
            builder.Property(candidate => candidate.SalesOrderId).HasColumnName("sales_order_id");
            builder.Property(candidate => candidate.SalesOrderNumber).HasMaxLength(100).HasColumnName("sales_order_number");
            builder.Property(candidate => candidate.CustomerId).HasColumnName("customer_id");
            builder.Property(candidate => candidate.CustomerCode).HasMaxLength(50).HasColumnName("customer_code");
            builder.Property(candidate => candidate.CustomerName).HasMaxLength(255).HasColumnName("customer_name");
            builder.Property(candidate => candidate.CustomerEmail).HasMaxLength(160).HasColumnName("customer_email");
            builder.Property(candidate => candidate.TargetDate).HasColumnName("target_date");
            builder.Property(candidate => candidate.CompletedAtUtc).HasColumnName("completed_at_utc");
            builder.Property(candidate => candidate.Status).HasMaxLength(50).HasColumnName("status");
            builder.Property(candidate => candidate.CreatedAtUtc).HasColumnName("created_at_utc");
            builder.Property(candidate => candidate.UpdatedAtUtc).HasColumnName("updated_at_utc");
            builder.HasMany(candidate => candidate.Items)
                .WithOne(item => item.Candidate)
                .HasForeignKey(item => item.SalesOrderId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<InvoiceCandidateItem>(builder =>
        {
            builder.ToTable("invoice_candidate_items");
            builder.HasKey(item => item.Id);
            builder.HasIndex(item => item.SalesOrderItemId).IsUnique();
            builder.Property(item => item.Id).HasColumnName("id");
            builder.Property(item => item.SalesOrderId).HasColumnName("sales_order_id");
            builder.Property(item => item.SalesOrderItemId).HasColumnName("sales_order_item_id");
            builder.Property(item => item.ProductId).HasColumnName("product_id");
            builder.Property(item => item.ProductPartNumber).HasMaxLength(100).HasColumnName("product_part_number");
            builder.Property(item => item.ProductDescription).HasColumnName("product_description");
            builder.Property(item => item.Qty).HasColumnName("qty");
            builder.Property(item => item.UnitPrice).HasColumnType("numeric(18,2)").HasColumnName("unit_price");
        });

        modelBuilder.Entity<Invoice>(builder =>
        {
            builder.ToTable("invoices");
            builder.HasKey(invoice => invoice.Id);
            builder.HasIndex(invoice => invoice.InvoiceNumber).IsUnique();
            builder.HasIndex(invoice => invoice.SalesOrderId).IsUnique();
            builder.HasIndex(invoice => invoice.CustomerId);
            builder.HasIndex(invoice => invoice.DueDate);
            builder.Property(invoice => invoice.Id).HasColumnName("id");
            builder.Property(invoice => invoice.InvoiceNumber).HasMaxLength(100).HasColumnName("invoice_number");
            builder.Property(invoice => invoice.SalesOrderId).HasColumnName("sales_order_id");
            builder.Property(invoice => invoice.SalesOrderNumber).HasMaxLength(100).HasColumnName("sales_order_number");
            builder.Property(invoice => invoice.CustomerId).HasColumnName("customer_id");
            builder.Property(invoice => invoice.CustomerCode).HasMaxLength(50).HasColumnName("customer_code");
            builder.Property(invoice => invoice.CustomerName).HasMaxLength(255).HasColumnName("customer_name");
            builder.Property(invoice => invoice.CustomerEmail).HasMaxLength(160).HasColumnName("customer_email");
            builder.Property(invoice => invoice.InvoiceDate).HasColumnName("invoice_date");
            builder.Property(invoice => invoice.DueDate).HasColumnName("due_date");
            builder.Property(invoice => invoice.Subtotal).HasColumnType("numeric(18,2)").HasColumnName("subtotal");
            builder.Property(invoice => invoice.TaxPercent).HasColumnType("numeric(5,2)").HasColumnName("tax_percent");
            builder.Property(invoice => invoice.TaxAmount).HasColumnType("numeric(18,2)").HasColumnName("tax_amount");
            builder.Property(invoice => invoice.TotalAmount).HasColumnType("numeric(18,2)").HasColumnName("total_amount");
            builder.Property(invoice => invoice.PaidAmount).HasColumnType("numeric(18,2)").HasColumnName("paid_amount");
            builder.Property(invoice => invoice.PaymentPercent).HasColumnType("numeric(5,2)").HasColumnName("payment_percent");
            builder.Property(invoice => invoice.Status).HasMaxLength(50).HasColumnName("status");
            builder.Property(invoice => invoice.BankName).HasMaxLength(120).HasColumnName("bank_name");
            builder.Property(invoice => invoice.BankAccountName).HasMaxLength(160).HasColumnName("bank_account_name");
            builder.Property(invoice => invoice.BankAccountNumber).HasMaxLength(80).HasColumnName("bank_account_number");
            builder.Property(invoice => invoice.CreatedAtUtc).HasColumnName("created_at_utc");
            builder.Property(invoice => invoice.UpdatedAtUtc).HasColumnName("updated_at_utc");
            builder.HasMany(invoice => invoice.Items)
                .WithOne(item => item.Invoice)
                .HasForeignKey(item => item.InvoiceId)
                .OnDelete(DeleteBehavior.Cascade);
            builder.HasMany(invoice => invoice.PaymentSchedules)
                .WithOne(schedule => schedule.Invoice)
                .HasForeignKey(schedule => schedule.InvoiceId)
                .OnDelete(DeleteBehavior.Cascade);
            builder.HasMany(invoice => invoice.Payments)
                .WithOne(payment => payment.Invoice)
                .HasForeignKey(payment => payment.InvoiceId)
                .OnDelete(DeleteBehavior.Cascade);
            builder.HasMany(invoice => invoice.PaymentVerificationRequests)
                .WithOne(request => request.Invoice)
                .HasForeignKey(request => request.InvoiceId)
                .OnDelete(DeleteBehavior.Cascade);
            builder.HasMany(invoice => invoice.CollectionLetters)
                .WithOne(letter => letter.Invoice)
                .HasForeignKey(letter => letter.InvoiceId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<InvoiceItem>(builder =>
        {
            builder.ToTable("invoice_items");
            builder.HasKey(item => item.Id);
            builder.Property(item => item.Id).HasColumnName("id");
            builder.Property(item => item.InvoiceId).HasColumnName("invoice_id");
            builder.Property(item => item.SalesOrderItemId).HasColumnName("sales_order_item_id");
            builder.Property(item => item.ProductId).HasColumnName("product_id");
            builder.Property(item => item.PartNumber).HasMaxLength(100).HasColumnName("part_number");
            builder.Property(item => item.Description).HasColumnName("description");
            builder.Property(item => item.Qty).HasColumnName("qty");
            builder.Property(item => item.UnitPrice).HasColumnType("numeric(18,2)").HasColumnName("unit_price");
            builder.Property(item => item.LineTotal).HasColumnType("numeric(18,2)").HasColumnName("line_total");
        });

        modelBuilder.Entity<PaymentSchedule>(builder =>
        {
            builder.ToTable("payment_schedules");
            builder.HasKey(schedule => schedule.Id);
            builder.Property(schedule => schedule.Id).HasColumnName("id");
            builder.Property(schedule => schedule.InvoiceId).HasColumnName("invoice_id");
            builder.Property(schedule => schedule.Label).HasMaxLength(100).HasColumnName("label");
            builder.Property(schedule => schedule.Percentage).HasColumnType("numeric(5,2)").HasColumnName("percentage");
            builder.Property(schedule => schedule.Amount).HasColumnType("numeric(18,2)").HasColumnName("amount");
            builder.Property(schedule => schedule.DueDate).HasColumnName("due_date");
            builder.Property(schedule => schedule.IsPaid).HasColumnName("is_paid");
        });

        modelBuilder.Entity<PaymentRecord>(builder =>
        {
            builder.ToTable("payment_records");
            builder.HasKey(payment => payment.Id);
            builder.Property(payment => payment.Id).HasColumnName("id");
            builder.Property(payment => payment.InvoiceId).HasColumnName("invoice_id");
            builder.Property(payment => payment.PaymentDate).HasColumnName("payment_date");
            builder.Property(payment => payment.Amount).HasColumnType("numeric(18,2)").HasColumnName("amount");
            builder.Property(payment => payment.Notes).HasColumnName("notes");
            builder.Property(payment => payment.CreatedAtUtc).HasColumnName("created_at_utc");
        });

        modelBuilder.Entity<PaymentVerificationRequest>(builder =>
        {
            builder.ToTable("payment_verification_requests");
            builder.HasKey(request => request.Id);
            builder.HasIndex(request => request.InvoiceId);
            builder.HasIndex(request => request.Status);
            builder.Property(request => request.Id).HasColumnName("id");
            builder.Property(request => request.InvoiceId).HasColumnName("invoice_id");
            builder.Property(request => request.PaymentDate).HasColumnName("payment_date");
            builder.Property(request => request.Amount).HasColumnType("numeric(18,2)").HasColumnName("amount");
            builder.Property(request => request.BankName).HasMaxLength(120).HasColumnName("bank_name");
            builder.Property(request => request.BankReference).HasMaxLength(120).HasColumnName("bank_reference");
            builder.Property(request => request.ProofFileName).HasMaxLength(255).HasColumnName("proof_file_name");
            builder.Property(request => request.ProofFileUrl).HasColumnName("proof_file_url");
            builder.Property(request => request.Notes).HasColumnName("notes");
            builder.Property(request => request.Status).HasMaxLength(50).HasColumnName("status");
            builder.Property(request => request.SubmittedBy).HasMaxLength(80).HasColumnName("submitted_by");
            builder.Property(request => request.SubmittedAtUtc).HasColumnName("submitted_at_utc");
            builder.Property(request => request.VerifiedBy).HasMaxLength(80).HasColumnName("verified_by");
            builder.Property(request => request.VerifiedAtUtc).HasColumnName("verified_at_utc");
            builder.Property(request => request.RejectionReason).HasColumnName("rejection_reason");
            builder.Property(request => request.RejectedAtUtc).HasColumnName("rejected_at_utc");
        });

        modelBuilder.Entity<CollectionLetter>(builder =>
        {
            builder.ToTable("collection_letters");
            builder.HasKey(letter => letter.Id);
            builder.Property(letter => letter.Id).HasColumnName("id");
            builder.Property(letter => letter.InvoiceId).HasColumnName("invoice_id");
            builder.Property(letter => letter.LetterNumber).HasMaxLength(100).HasColumnName("letter_number");
            builder.Property(letter => letter.IssuedDate).HasColumnName("issued_date");
            builder.Property(letter => letter.DueDate).HasColumnName("due_date");
            builder.Property(letter => letter.Notes).HasColumnName("notes");
            builder.Property(letter => letter.CreatedAtUtc).HasColumnName("created_at_utc");
        });

        modelBuilder.Entity<SupplierPayment>(builder =>
        {
            builder.ToTable("supplier_payments");
            builder.HasKey(payment => payment.Id);
            builder.HasIndex(payment => payment.PoNumber);
            builder.Property(payment => payment.Id).HasColumnName("id");
            builder.Property(payment => payment.PoNumber).HasMaxLength(100).HasColumnName("po_number");
            builder.Property(payment => payment.SupplierName).HasMaxLength(255).HasColumnName("supplier_name");
            builder.Property(payment => payment.PaymentDate).HasColumnName("payment_date");
            builder.Property(payment => payment.Amount).HasColumnType("numeric(18,2)").HasColumnName("amount");
            builder.Property(payment => payment.BankName).HasMaxLength(120).HasColumnName("bank_name");
            builder.Property(payment => payment.BankReference).HasMaxLength(120).HasColumnName("bank_reference");
            builder.Property(payment => payment.ProofFileName).HasMaxLength(255).HasColumnName("proof_file_name");
            builder.Property(payment => payment.ProofFileUrl).HasColumnName("proof_file_url");
            builder.Property(payment => payment.Notes).HasColumnName("notes");
            builder.Property(payment => payment.CreatedAtUtc).HasColumnName("created_at_utc");
        });

        modelBuilder.ApplyConfiguration(new OutboxMessageConfiguration());

        modelBuilder.Entity<FinanceSetting>(builder =>
        {
            builder.ToTable("finance_settings");
            builder.HasKey(setting => setting.Id);
            builder.Property(setting => setting.Id).HasMaxLength(50).HasColumnName("id");
            builder.Property(setting => setting.OpeningBalance).HasColumnType("numeric(18,2)").HasColumnName("opening_balance");
            builder.Property(setting => setting.MonthlyTarget).HasColumnType("numeric(18,2)").HasColumnName("monthly_target");
        });
    }
}
