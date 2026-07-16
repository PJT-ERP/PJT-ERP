using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using PJT_ERP.EventBus.Messages.Events;
using PJT_ERP.Finance.Api.Domain.Entities;
using PJT_ERP.Finance.Api.Infrastructure.Persistence;
using PJT_ERP.Shared.Infrastructure.Messaging;
using PJT_ERP.Shared.Infrastructure.Security;

namespace PJT_ERP.Finance.Api.Application.Finance;

public sealed partial class FinanceService(FinanceContext db, IWebHostEnvironment env, IEventPublisher? eventPublisher = null) : IFinanceService
{
    public async Task<IReadOnlyCollection<InvoiceCandidateDto>> ListInvoiceCandidatesAsync(Guid? customerId, CancellationToken cancellationToken)
    {
        var query = db.InvoiceCandidates
            .AsNoTracking()
            .Include(candidate => candidate.Items)
            .AsQueryable();

        if (customerId.HasValue)
        {
            query = query.Where(candidate => candidate.CustomerId == customerId.Value);
        }

        var candidates = await query
            .OrderByDescending(candidate => candidate.CompletedAtUtc)
            .ToListAsync(cancellationToken);

        return candidates.Select(ToDto).ToArray();
    }

    public async Task<IReadOnlyCollection<InvoiceDto>> ListInvoicesAsync(
        Guid? customerId,
        DateOnly? dueFrom,
        DateOnly? dueTo,
        string? status,
        string? sortBy,
        CancellationToken cancellationToken)
    {
        var query = IncludeInvoice(db.Invoices.AsNoTracking());

        if (customerId.HasValue)
        {
            query = query.Where(invoice => invoice.CustomerId == customerId.Value);
        }

        if (dueFrom.HasValue)
        {
            query = query.Where(invoice => invoice.DueDate >= dueFrom.Value);
        }

        if (dueTo.HasValue)
        {
            query = query.Where(invoice => invoice.DueDate <= dueTo.Value);
        }

        var invoices = await query.ToListAsync(cancellationToken);
        if (!string.IsNullOrWhiteSpace(status))
        {
            invoices = invoices
                .Where(invoice => ResolveStatus(invoice).Equals(status.Trim(), StringComparison.OrdinalIgnoreCase))
                .ToList();
        }

        return ApplySort(invoices, sortBy)
            .Select(ToDto)
            .ToArray();
    }

    public async Task<InvoiceDto?> GetInvoiceAsync(Guid invoiceId, CancellationToken cancellationToken)
    {
        var invoice = await IncludeInvoice(db.Invoices.AsNoTracking())
            .FirstOrDefaultAsync(invoice => invoice.Id == invoiceId, cancellationToken);

        return invoice is null ? null : ToDto(invoice);
    }

    public async Task<InvoiceDto> CreateInvoiceAsync(CreateInvoiceRequest request, CancellationToken cancellationToken)
    {
        ValidateCreateInvoiceRequest(request);

        var candidate = await db.InvoiceCandidates
            .Include(candidate => candidate.Items)
            .FirstOrDefaultAsync(candidate => candidate.SalesOrderId == request.SalesOrderId, cancellationToken);

        if (candidate is null)
        {
            if (request.FallbackCandidate is not null)
            {
                candidate = new InvoiceCandidate
                {
                    SalesOrderId = request.SalesOrderId,
                    SalesOrderNumber = request.FallbackCandidate.SalesOrderNumber,
                    CustomerId = request.FallbackCandidate.CustomerId,
                    CustomerCode = request.FallbackCandidate.CustomerCode,
                    CustomerName = request.FallbackCandidate.CustomerName,
                    CustomerEmail = request.FallbackCandidate.CustomerEmail,
                    TargetDate = DateOnly.FromDateTime(DateTime.UtcNow),
                    CompletedAtUtc = DateTime.UtcNow,
                    Status = InvoiceCandidateStatuses.ReadyForInvoice,
                    Items = request.FallbackCandidate.Items.Select(i => new InvoiceCandidateItem
                    {
                        SalesOrderItemId = i.SalesOrderItemId,
                        ProductId = i.ProductId,
                        ProductPartNumber = i.ProductPartNumber,
                        ProductDescription = i.ProductDescription,
                        Qty = i.Qty,
                        UnitPrice = 0
                    }).ToList()
                };
                await db.InvoiceCandidates.AddAsync(candidate, cancellationToken);
            }
            else
            {
                throw new InvalidOperationException("Sales order is not ready for invoice yet.");
            }
        }

        if (candidate.Status == InvoiceCandidateStatuses.Invoiced
            || await db.Invoices.AnyAsync(invoice => invoice.SalesOrderId == request.SalesOrderId, cancellationToken))
        {
            throw new InvalidOperationException("This sales order already has an invoice.");
        }

        var requestPrices = request.Items.ToDictionary(item => item.SalesOrderItemId, item => item.UnitPrice);
        if (requestPrices.Count != candidate.Items.Count || candidate.Items.Any(item => !requestPrices.ContainsKey(item.SalesOrderItemId)))
        {
            throw new InvalidOperationException("Invoice item prices must match all sales order items.");
        }

        var invoiceItems = candidate.Items
            .OrderBy(item => item.ProductPartNumber)
            .Select(item =>
            {
                var requestedPrice = RoundMoney(requestPrices[item.SalesOrderItemId]);
                var approvedPrice = RoundMoney(item.UnitPrice);

                if (approvedPrice > 0 && requestedPrice != approvedPrice)
                {
                    throw new InvalidOperationException(
                        $"Price tampering detected for item '{item.ProductPartNumber}'. Requested UnitPrice ({requestedPrice:N2}) does not match Approved Costing Price ({approvedPrice:N2}).");
                }

                var finalUnitPrice = approvedPrice > 0 ? approvedPrice : requestedPrice;
                if (finalUnitPrice <= 0)
                {
                    throw new InvalidOperationException($"Invoice item unit price for '{item.ProductPartNumber}' must be greater than zero.");
                }

                return new InvoiceItem
                {
                    SalesOrderItemId = item.SalesOrderItemId,
                    ProductId = item.ProductId,
                    PartNumber = item.ProductPartNumber,
                    Description = item.ProductDescription,
                    Qty = item.Qty,
                    UnitPrice = finalUnitPrice,
                    LineTotal = RoundMoney(finalUnitPrice * item.Qty)
                };
            })
            .ToList();

        var subtotal = RoundMoney(invoiceItems.Sum(item => item.LineTotal));
        var taxAmount = RoundMoney(subtotal * request.TaxPercent / 100);
        var totalAmount = RoundMoney(subtotal + taxAmount);

        var paymentSchedules = BuildPaymentSchedules(request, totalAmount);
        var invoice = new Invoice
        {
            InvoiceNumber = await GenerateInvoiceNumberAsync(cancellationToken),
            SalesOrderId = candidate.SalesOrderId,
            SalesOrderNumber = candidate.SalesOrderNumber,
            CustomerId = candidate.CustomerId,
            CustomerCode = candidate.CustomerCode,
            CustomerName = candidate.CustomerName,
            CustomerEmail = candidate.CustomerEmail,
            InvoiceDate = request.InvoiceDate,
            DueDate = request.DueDate,
            Subtotal = subtotal,
            TaxPercent = request.TaxPercent,
            TaxAmount = taxAmount,
            TotalAmount = totalAmount,
            BankName = NormalizeOptional(request.BankName),
            BankAccountName = NormalizeOptional(request.BankAccountName),
            BankAccountNumber = NormalizeOptional(request.BankAccountNumber),
            Items = invoiceItems,
            PaymentSchedules = paymentSchedules
        };

        foreach (var item in invoice.Items)
        {
            item.InvoiceId = invoice.Id;
        }

        foreach (var schedule in invoice.PaymentSchedules)
        {
            schedule.InvoiceId = invoice.Id;
        }

        candidate.Status = InvoiceCandidateStatuses.Invoiced;
        candidate.UpdatedAtUtc = DateTime.UtcNow;

        await db.Invoices.AddAsync(invoice, cancellationToken);
        await db.SaveChangesAsync(cancellationToken);

        return await GetInvoiceAsync(invoice.Id, cancellationToken)
            ?? throw new InvalidOperationException("Invoice was not found after creation.");
    }

    public async Task<InvoiceDto?> RecordPaymentAsync(Guid invoiceId, RecordPaymentRequest request, CancellationToken cancellationToken)
    {
        var invoice = await db.Invoices
            .FirstOrDefaultAsync(invoice => invoice.Id == invoiceId, cancellationToken);

        if (invoice is null)
        {
            return null;
        }

        await ApplyPaymentAsync(invoice, request.PaymentDate, request.Amount, request.Notes, cancellationToken);
        await db.SaveChangesAsync(cancellationToken);

        return await GetInvoiceAsync(invoice.Id, cancellationToken);
    }

    public async Task<IReadOnlyCollection<PaymentVerificationRequestDto>> ListPaymentVerificationsAsync(
        string? status,
        CancellationToken cancellationToken)
    {
        var query = IncludePaymentVerification(db.PaymentVerificationRequests.AsNoTracking());

        if (!string.IsNullOrWhiteSpace(status))
        {
            var normalizedStatus = status.Trim();
            query = query.Where(request => request.Status == normalizedStatus);
        }

        var requests = await query
            .OrderByDescending(request => request.SubmittedAtUtc)
            .ToListAsync(cancellationToken);

        return requests.Select(ToDto).ToArray();
    }

    public async Task<PaymentVerificationRequestDto?> SubmitPaymentProofAsync(
        Guid invoiceId,
        SubmitPaymentProofFormRequest request,
        CancellationToken cancellationToken)
    {
        if (request.Amount <= 0)
        {
            throw new InvalidOperationException("Payment amount must be greater than zero.");
        }

        if (request.ProofFile is null || request.ProofFile.Length == 0)
        {
            throw new InvalidOperationException("Payment proof file is required.");
        }

        var originalFileName = request.ProofFile.FileName;
        var proofFileName = NormalizeOptional(originalFileName);
        
        if (proofFileName is null)
        {
            throw new InvalidOperationException("Payment proof file name is required.");
        }

        var invoice = await db.Invoices
            .FirstOrDefaultAsync(invoice => invoice.Id == invoiceId, cancellationToken);

        if (invoice is null)
        {
            return null;
        }

        var paymentAmount = RoundMoney(request.Amount);
        var remaining = RoundMoney(invoice.TotalAmount - invoice.PaidAmount);
        if (paymentAmount > remaining)
        {
            throw new InvalidOperationException("Payment amount cannot exceed the remaining invoice balance.");
        }

        var bankName = NormalizeOptional(request.BankName) ?? invoice.BankName ?? "Bank Transfer";
        var bankReference = NormalizeOptional(request.BankReference) ?? $"PAY-{Guid.NewGuid():N}"[..12].ToUpperInvariant();
        var notes = NormalizeOptional(request.Notes);

        var duplicateRequest = await IncludePaymentVerification(db.PaymentVerificationRequests)
            .FirstOrDefaultAsync(existing =>
                existing.InvoiceId == invoice.Id
                && existing.Status == PaymentVerificationStatuses.Pending
                && existing.PaymentDate == request.PaymentDate
                && existing.Amount == paymentAmount,
                cancellationToken);

        if (duplicateRequest is not null)
        {
            return ToDto(duplicateRequest);
        }

        await FileUploadSecurityValidator.ValidateFileAsync(request.ProofFile, cancellationToken);

        var safeInvoiceNumber = invoice.InvoiceNumber.Replace("/", "-");
        var sanitizedName = FileUploadSecurityValidator.SanitizeFileName(originalFileName);
        var uniqueFileName = $"bukti-{safeInvoiceNumber}-{sanitizedName}";
        var uploadsFolder = Path.Combine(env.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot"), "proofs");
        Directory.CreateDirectory(uploadsFolder);
        var filePath = Path.Combine(uploadsFolder, uniqueFileName);

        using (var stream = new FileStream(filePath, FileMode.Create))
        {
            await request.ProofFile.CopyToAsync(stream, cancellationToken);
        }

        var proofFileUrl = $"/proofs/{uniqueFileName}";

        var proofRequest = new PaymentVerificationRequest
        {
            InvoiceId = invoice.Id,
            PaymentDate = request.PaymentDate,
            Amount = paymentAmount,
            BankName = bankName,
            BankReference = bankReference,
            ProofFileName = originalFileName,
            ProofFileUrl = proofFileUrl,
            Notes = notes,
            Status = PaymentVerificationStatuses.Pending,
            SubmittedBy = "Sales",
            SubmittedAtUtc = DateTime.UtcNow
        };

        await db.PaymentVerificationRequests.AddAsync(proofRequest, cancellationToken);
        await db.SaveChangesAsync(cancellationToken);

        return await GetPaymentVerificationRequestAsync(proofRequest.Id, cancellationToken);
    }

    public async Task<PaymentVerificationRequestDto?> VerifyPaymentProofAsync(Guid requestId, CancellationToken cancellationToken)
    {
        var proofRequest = await IncludePaymentVerification(db.PaymentVerificationRequests)
            .FirstOrDefaultAsync(request => request.Id == requestId, cancellationToken);

        if (proofRequest is null)
        {
            return null;
        }

        if (proofRequest.Status == PaymentVerificationStatuses.Verified)
        {
            return ToDto(proofRequest);
        }

        if (proofRequest.Status == PaymentVerificationStatuses.Rejected)
        {
            throw new InvalidOperationException("Rejected payment proof cannot be verified.");
        }

        var invoice = proofRequest.Invoice
            ?? throw new InvalidOperationException("Invoice was not loaded for payment proof.");

        await ApplyPaymentAsync(
            invoice,
            proofRequest.PaymentDate,
            proofRequest.Amount,
            BuildPaymentProofNotes(proofRequest),
            cancellationToken);

        proofRequest.Status = PaymentVerificationStatuses.Verified;
        proofRequest.VerifiedBy = "Backend";
        proofRequest.VerifiedAtUtc = DateTime.UtcNow;
        proofRequest.RejectionReason = null;
        proofRequest.RejectedAtUtc = null;

        await db.SaveChangesAsync(cancellationToken);
        return await GetPaymentVerificationRequestAsync(proofRequest.Id, cancellationToken);
    }

    public async Task<PaymentVerificationRequestDto?> RejectPaymentProofAsync(
        Guid requestId,
        RejectPaymentVerificationRequest request,
        CancellationToken cancellationToken)
    {
        var proofRequest = await IncludePaymentVerification(db.PaymentVerificationRequests)
            .FirstOrDefaultAsync(existing => existing.Id == requestId, cancellationToken);

        if (proofRequest is null)
        {
            return null;
        }

        if (proofRequest.Status == PaymentVerificationStatuses.Verified)
        {
            throw new InvalidOperationException("Verified payment proof cannot be rejected.");
        }

        proofRequest.Status = PaymentVerificationStatuses.Rejected;
        proofRequest.RejectionReason = NormalizeOptional(request.Reason)
            ?? throw new InvalidOperationException("Rejection reason is required.");
        proofRequest.RejectedAtUtc = DateTime.UtcNow;
        proofRequest.VerifiedBy = null;
        proofRequest.VerifiedAtUtc = null;

        await db.SaveChangesAsync(cancellationToken);
        return await GetPaymentVerificationRequestAsync(proofRequest.Id, cancellationToken);
    }

    public async Task<InvoiceDto?> CreateCollectionLetterAsync(Guid invoiceId, CreateCollectionLetterRequest request, CancellationToken cancellationToken)
    {
        var invoice = await db.Invoices
            .FirstOrDefaultAsync(invoice => invoice.Id == invoiceId, cancellationToken);

        if (invoice is null)
        {
            return null;
        }

        if (invoice.PaidAmount >= invoice.TotalAmount)
        {
            throw new InvalidOperationException("Paid invoices do not need collection letters.");
        }

        if (invoice.DueDate >= request.IssuedDate)
        {
            throw new InvalidOperationException("Collection letters can only be issued after the invoice due date.");
        }

        var letter = new CollectionLetter
        {
            InvoiceId = invoice.Id,
            LetterNumber = await GenerateCollectionLetterNumberAsync(cancellationToken),
            IssuedDate = request.IssuedDate,
            DueDate = request.DueDate,
            Notes = NormalizeOptional(request.Notes)
        };
        await db.CollectionLetters.AddAsync(letter, cancellationToken);
        invoice.Status = InvoiceStatuses.Overdue;
        invoice.UpdatedAtUtc = DateTime.UtcNow;

        await db.SaveChangesAsync(cancellationToken);
        return await GetInvoiceAsync(invoice.Id, cancellationToken);
    }

    public async Task<FinanceDashboardDto> GetDashboardAsync(Guid? customerId, CancellationToken cancellationToken)
    {
        var query = IncludeInvoice(db.Invoices.AsNoTracking());
        if (customerId.HasValue)
        {
            query = query.Where(invoice => invoice.CustomerId == customerId.Value);
        }

        var invoices = await query.ToListAsync(cancellationToken);
        var overdue = invoices.Where(invoice => ResolveStatus(invoice) == InvoiceStatuses.Overdue).ToArray();
        var totalBilled = RoundMoney(invoices.Sum(invoice => invoice.TotalAmount));
        var totalPaid = RoundMoney(invoices.Sum(invoice => invoice.PaidAmount));
        var customerName = customerId.HasValue
            ? invoices.Select(invoice => invoice.CustomerName).FirstOrDefault()
            : null;

        return new FinanceDashboardDto(
            customerId,
            customerName,
            invoices.Count,
            overdue.Length,
            totalBilled,
            totalPaid,
            RoundMoney(totalBilled - totalPaid),
            RoundMoney(overdue.Sum(invoice => invoice.TotalAmount - invoice.PaidAmount)),
            invoices.Count == 0 ? 0 : decimal.Round(invoices.Average(invoice => invoice.PaymentPercent), 2));
    }

    public async Task<IReadOnlyCollection<SupplierPaymentDto>> ListSupplierPaymentsAsync(CancellationToken cancellationToken)
    {
        var payments = await db.SupplierPayments
            .AsNoTracking()
            .OrderByDescending(payment => payment.CreatedAtUtc)
            .ToListAsync(cancellationToken);

        return payments.Select(ToDto).ToArray();
    }

    public async Task<SupplierPaymentDto?> SubmitSupplierPaymentAsync(SubmitSupplierPaymentFormRequest request, CancellationToken cancellationToken)
    {
        if (request.Amount <= 0)
        {
            throw new InvalidOperationException("Payment amount must be greater than zero.");
        }

        var paymentAmount = RoundMoney(request.Amount);
        var bankName = NormalizeOptional(request.BankName) ?? "Bank Transfer";
        var bankReference = NormalizeOptional(request.BankReference) ?? $"PAY-{Guid.NewGuid():N}"[..12].ToUpperInvariant();
        var notes = NormalizeOptional(request.Notes);

        var payment = new SupplierPayment
        {
            PoNumber = request.PoNumber,
            SupplierName = request.SupplierName,
            PaymentDate = request.PaymentDate,
            Amount = paymentAmount,
            BankName = bankName,
            BankReference = bankReference,
            Notes = notes,
            CreatedAtUtc = DateTime.UtcNow
        };

        if (request.ProofFile is not null && request.ProofFile.Length > 0)
        {
            await FileUploadSecurityValidator.ValidateFileAsync(request.ProofFile, cancellationToken);
            var originalFileName = request.ProofFile.FileName;
            var safePoNumber = request.PoNumber.Replace("/", "-");
            var sanitizedName = FileUploadSecurityValidator.SanitizeFileName(originalFileName);
            var uniqueFileName = $"bukti-{safePoNumber}-{sanitizedName}";
            var uploadsFolder = Path.Combine(env.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot"), "proofs");
            Directory.CreateDirectory(uploadsFolder);
            var filePath = Path.Combine(uploadsFolder, uniqueFileName);

            using (var stream = new FileStream(filePath, FileMode.Create))
            {
                await request.ProofFile.CopyToAsync(stream, cancellationToken);
            }

            payment.ProofFileName = originalFileName;
            payment.ProofFileUrl = $"/proofs/{uniqueFileName}";
        }

        await db.SupplierPayments.AddAsync(payment, cancellationToken);
        await db.SaveChangesAsync(cancellationToken);

        return ToDto(payment);
    }

    public async Task<decimal> GetOpeningBalanceAsync(CancellationToken cancellationToken = default)
    {
        var setting = await db.Settings.FirstOrDefaultAsync(s => s.Id == "default", cancellationToken);
        return setting?.OpeningBalance ?? 250_000_000m;
    }

    public async Task UpdateOpeningBalanceAsync(decimal newBalance, CancellationToken cancellationToken = default)
    {
        var setting = await db.Settings.FirstOrDefaultAsync(s => s.Id == "default", cancellationToken);
        if (setting == null)
        {
            setting = new FinanceSetting { Id = "default", OpeningBalance = newBalance };
            db.Settings.Add(setting);
        }
        else
        {
            setting.OpeningBalance = newBalance;
        }

        await db.SaveChangesAsync(cancellationToken);
    }

    public async Task<decimal> GetMonthlyTargetAsync(CancellationToken cancellationToken = default)
    {
        var setting = await db.Settings.FirstOrDefaultAsync(s => s.Id == "default", cancellationToken);
        return setting?.MonthlyTarget ?? 1_000_000_000m;
    }

    public async Task UpdateMonthlyTargetAsync(decimal newTarget, CancellationToken cancellationToken = default)
    {
        var setting = await db.Settings.FirstOrDefaultAsync(s => s.Id == "default", cancellationToken);
        if (setting == null)
        {
            setting = new FinanceSetting { Id = "default", MonthlyTarget = newTarget };
            db.Settings.Add(setting);
        }
        else
        {
            setting.MonthlyTarget = newTarget;
        }

        await db.SaveChangesAsync(cancellationToken);
    }
}
