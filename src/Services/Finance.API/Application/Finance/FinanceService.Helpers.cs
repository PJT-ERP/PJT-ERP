using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using PJT_ERP.EventBus.Messages.Events;
using PJT_ERP.Finance.Api.Domain.Entities;
using PJT_ERP.Finance.Api.Infrastructure.Persistence;
using PJT_ERP.Shared.Infrastructure.Messaging;

namespace PJT_ERP.Finance.Api.Application.Finance;

public sealed partial class FinanceService
{
    private static IQueryable<Invoice> IncludeInvoice(IQueryable<Invoice> query)
    {
        return query
            .Include(invoice => invoice.Items)
            .Include(invoice => invoice.PaymentSchedules)
            .Include(invoice => invoice.Payments)
            .Include(invoice => invoice.CollectionLetters)
            .AsSplitQuery();
    }

    private static IQueryable<PaymentVerificationRequest> IncludePaymentVerification(
        IQueryable<PaymentVerificationRequest> query)
    {
        return query.Include(request => request.Invoice);
    }

    private async Task<PaymentVerificationRequestDto?> GetPaymentVerificationRequestAsync(
        Guid requestId,
        CancellationToken cancellationToken)
    {
        var proofRequest = await IncludePaymentVerification(db.PaymentVerificationRequests.AsNoTracking())
            .FirstOrDefaultAsync(request => request.Id == requestId, cancellationToken);

        return proofRequest is null ? null : ToDto(proofRequest);
    }

    private async Task ApplyPaymentAsync(
        Invoice invoice,
        DateOnly paymentDate,
        decimal amount,
        string? notes,
        CancellationToken cancellationToken)
    {
        if (amount <= 0)
        {
            throw new InvalidOperationException("Payment amount must be greater than zero.");
        }

        var paymentAmount = RoundMoney(amount);
        var paymentNotes = NormalizeOptional(notes);
        var duplicatePaymentExists = await db.PaymentRecords.AnyAsync(payment =>
            payment.InvoiceId == invoice.Id
            && payment.PaymentDate == paymentDate
            && payment.Amount == paymentAmount
            && payment.Notes == paymentNotes,
            cancellationToken);

        if (duplicatePaymentExists)
        {
            return;
        }

        var remaining = RoundMoney(invoice.TotalAmount - invoice.PaidAmount);
        if (paymentAmount > remaining)
        {
            throw new InvalidOperationException("Payment amount cannot exceed the remaining invoice balance.");
        }

        await db.PaymentRecords.AddAsync(new PaymentRecord
        {
            InvoiceId = invoice.Id,
            PaymentDate = paymentDate,
            Amount = paymentAmount,
            Notes = paymentNotes
        }, cancellationToken);

        invoice.PaidAmount = RoundMoney(invoice.PaidAmount + paymentAmount);
        invoice.PaymentPercent = invoice.TotalAmount == 0
            ? 100
            : decimal.Round(invoice.PaidAmount / invoice.TotalAmount * 100, 2);
        invoice.Status = invoice.PaidAmount >= invoice.TotalAmount
            ? InvoiceStatuses.Paid
            : InvoiceStatuses.PartiallyPaid;
        invoice.UpdatedAtUtc = DateTime.UtcNow;

        if (eventPublisher is not null)
        {
            await eventPublisher.PublishAsync(
                new InvoicePaymentRecordedEvent(
                    invoice.Id,
                    invoice.InvoiceNumber,
                    invoice.SalesOrderId,
                    invoice.SalesOrderNumber,
                    invoice.CustomerId,
                    paymentAmount,
                    invoice.PaidAmount,
                    invoice.TotalAmount,
                    invoice.PaymentPercent,
                    paymentDate,
                    invoice.PaidAmount >= invoice.TotalAmount),
                cancellationToken);
        }
    }

    private static List<Invoice> ApplySort(List<Invoice> invoices, string? sortBy)
    {
        return (sortBy?.Trim().ToLowerInvariant()) switch
        {
            "duedateasc" => invoices.OrderBy(invoice => invoice.DueDate).ToList(),
            "duedatedesc" => invoices.OrderByDescending(invoice => invoice.DueDate).ToList(),
            "invoicedateasc" => invoices.OrderBy(invoice => invoice.InvoiceDate).ToList(),
            "invoicedatedesc" => invoices.OrderByDescending(invoice => invoice.InvoiceDate).ToList(),
            _ => invoices.OrderByDescending(invoice => invoice.CreatedAtUtc).ToList()
        };
    }

    private static void ValidateCreateInvoiceRequest(CreateInvoiceRequest request)
    {
        if (request.SalesOrderId == Guid.Empty)
        {
            throw new InvalidOperationException("Sales order id is required.");
        }

        if (request.Items.Count == 0)
        {
            throw new InvalidOperationException("Invoice must contain item prices.");
        }

        if (request.Items.Any(item => item.UnitPrice < 0))
        {
            throw new InvalidOperationException("Invoice item unit price cannot be negative.");
        }

        if (request.TaxPercent < 0)
        {
            throw new InvalidOperationException("Tax percent cannot be negative.");
        }

        if (request.DueDate < request.InvoiceDate)
        {
            throw new InvalidOperationException("Invoice due date cannot be earlier than invoice date.");
        }
    }

    private static List<PaymentSchedule> BuildPaymentSchedules(CreateInvoiceRequest request, decimal totalAmount)
    {
        var schedules = request.PaymentSchedules.Count == 0
            ? [new CreatePaymentScheduleRequest("Full Payment", 100, request.DueDate)]
            : request.PaymentSchedules;

        if (schedules.Any(schedule => schedule.Percentage <= 0 || schedule.Percentage > 100))
        {
            throw new InvalidOperationException("Payment schedule percentage must be between 0 and 100.");
        }

        var totalPercentage = schedules.Sum(schedule => schedule.Percentage);
        if (totalPercentage > 100)
        {
            throw new InvalidOperationException("Total payment schedule percentage cannot exceed 100.");
        }

        return schedules
            .Select(schedule => new PaymentSchedule
            {
                Label = string.IsNullOrWhiteSpace(schedule.Label) ? $"{schedule.Percentage:0.##}% Payment" : schedule.Label.Trim(),
                Percentage = schedule.Percentage,
                Amount = RoundMoney(totalAmount * schedule.Percentage / 100),
                DueDate = schedule.DueDate
            })
            .ToList();
    }

    private static InvoiceCandidateDto ToDto(InvoiceCandidate candidate)
    {
        return new InvoiceCandidateDto(
            candidate.SalesOrderId,
            candidate.SalesOrderNumber,
            candidate.CustomerId,
            candidate.CustomerCode,
            candidate.CustomerName,
            candidate.CustomerEmail,
            candidate.TargetDate,
            candidate.CompletedAtUtc,
            candidate.Status,
            candidate.Items
                .OrderBy(item => item.ProductPartNumber)
                .Select(item => new InvoiceCandidateItemDto(
                    item.SalesOrderItemId,
                    item.ProductId,
                    item.ProductPartNumber,
                    item.ProductDescription,
                    item.Qty,
                    item.UnitPrice))
                .ToArray());
    }

    private static InvoiceDto ToDto(Invoice invoice)
    {
        return new InvoiceDto(
            invoice.Id,
            invoice.InvoiceNumber,
            invoice.SalesOrderId,
            invoice.SalesOrderNumber,
            invoice.CustomerId,
            invoice.CustomerCode,
            invoice.CustomerName,
            invoice.CustomerEmail,
            invoice.InvoiceDate,
            invoice.DueDate,
            invoice.Subtotal,
            invoice.TaxPercent,
            invoice.TaxAmount,
            invoice.TotalAmount,
            invoice.PaidAmount,
            RoundMoney(invoice.TotalAmount - invoice.PaidAmount),
            invoice.PaymentPercent,
            ResolveStatus(invoice),
            invoice.BankName,
            invoice.BankAccountName,
            invoice.BankAccountNumber,
            invoice.Items
                .OrderBy(item => item.PartNumber)
                .Select(item => new InvoiceItemDto(
                    item.SalesOrderItemId,
                    item.ProductId,
                    item.PartNumber,
                    item.Description,
                    item.Qty,
                    item.UnitPrice,
                    item.LineTotal))
                .ToArray(),
            BuildPaymentScheduleDtos(invoice),
            invoice.Payments
                .OrderByDescending(payment => payment.PaymentDate)
                .Select(payment => new PaymentRecordDto(
                    payment.Id,
                    payment.PaymentDate,
                    payment.Amount,
                    payment.Notes))
                .ToArray(),
            invoice.CollectionLetters
                .OrderByDescending(letter => letter.IssuedDate)
                .Select(letter => new CollectionLetterDto(
                    letter.Id,
                    letter.LetterNumber,
                    letter.IssuedDate,
                    letter.DueDate,
                    letter.Notes))
                .ToArray());
    }

    private static PaymentVerificationRequestDto ToDto(PaymentVerificationRequest proofRequest)
    {
        var invoice = proofRequest.Invoice
            ?? throw new InvalidOperationException("Invoice was not loaded for payment verification request.");

        return new PaymentVerificationRequestDto(
            proofRequest.Id,
            proofRequest.InvoiceId,
            invoice.InvoiceNumber,
            invoice.SalesOrderId,
            invoice.SalesOrderNumber,
            invoice.CustomerId,
            invoice.CustomerName,
            proofRequest.PaymentDate,
            proofRequest.Amount,
            proofRequest.BankName,
            proofRequest.BankReference,
            proofRequest.ProofFileName,
            proofRequest.ProofFileUrl,
            proofRequest.Notes,
            proofRequest.Status,
            proofRequest.SubmittedBy,
            proofRequest.SubmittedAtUtc,
            proofRequest.VerifiedBy,
            proofRequest.VerifiedAtUtc,
            proofRequest.RejectionReason,
            proofRequest.RejectedAtUtc);
    }

    private static SupplierPaymentDto ToDto(SupplierPayment payment)
    {
        return new SupplierPaymentDto(
            payment.Id,
            payment.PoNumber,
            payment.SupplierName,
            payment.PaymentDate,
            payment.Amount,
            payment.BankName,
            payment.BankReference,
            payment.ProofFileName,
            payment.ProofFileUrl,
            payment.Notes,
            payment.CreatedAtUtc);
    }

    private static PaymentScheduleDto[] BuildPaymentScheduleDtos(Invoice invoice)
    {
        var paidAmount = invoice.PaidAmount;
        return invoice.PaymentSchedules
            .OrderBy(schedule => schedule.DueDate)
            .Select(schedule =>
            {
                var isPaid = schedule.IsPaid || paidAmount >= schedule.Amount;
                if (isPaid)
                {
                    paidAmount -= schedule.Amount;
                }

                return new PaymentScheduleDto(
                    schedule.Id,
                    schedule.Label,
                    schedule.Percentage,
                    schedule.Amount,
                    schedule.DueDate,
                    isPaid);
            })
            .ToArray();
    }

    private static string ResolveStatus(Invoice invoice)
    {
        if (invoice.PaidAmount >= invoice.TotalAmount)
        {
            return InvoiceStatuses.Paid;
        }

        if (invoice.DueDate < DateOnly.FromDateTime(DateTime.UtcNow))
        {
            return InvoiceStatuses.Overdue;
        }

        return invoice.PaidAmount > 0 ? InvoiceStatuses.PartiallyPaid : invoice.Status;
    }

    private static decimal RoundMoney(decimal value)
    {
        return decimal.Round(value, 2, MidpointRounding.AwayFromZero);
    }

    private static string? NormalizeOptional(string? value)
    {
        return string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    }

    private static string? BuildPaymentProofNotes(PaymentVerificationRequest proofRequest)
    {
        var parts = new[]
        {
            NormalizeOptional(proofRequest.Notes),
            NormalizeOptional(proofRequest.BankName) is { } bank ? $"Bank {bank}" : null,
            NormalizeOptional(proofRequest.BankReference) is { } reference ? $"Ref {reference}" : null,
            NormalizeOptional(proofRequest.ProofFileName) is { } proof ? $"Bukti {proof}" : null
        };

        var notes = string.Join(" · ", parts.Where(part => part is not null));
        return string.IsNullOrWhiteSpace(notes) ? null : notes;
    }

    private async Task<string> GenerateInvoiceNumberAsync(CancellationToken cancellationToken)
    {
        var prefix = $"INV-{DateTime.UtcNow:yyyy}-";
        var existingNumbers = await db.Invoices
            .AsNoTracking()
            .Where(x => x.InvoiceNumber.StartsWith(prefix))
            .Select(x => x.InvoiceNumber)
            .ToListAsync(cancellationToken);

        return $"{prefix}{NextSequence(existingNumbers, prefix):0000}";
    }

    private async Task<string> GenerateCollectionLetterNumberAsync(CancellationToken cancellationToken)
    {
        var prefix = $"COL-{DateTime.UtcNow:yyyy}-";
        var existingNumbers = await db.CollectionLetters
            .AsNoTracking()
            .Where(x => x.LetterNumber.StartsWith(prefix))
            .Select(x => x.LetterNumber)
            .ToListAsync(cancellationToken);

        return $"{prefix}{NextSequence(existingNumbers, prefix):0000}";
    }

    private static int NextSequence(IEnumerable<string> existingNumbers, string prefix)
    {
        var max = 0;
        foreach (var number in existingNumbers)
        {
            if (number.Length <= prefix.Length) continue;
            if (int.TryParse(number[prefix.Length..], out var value) && value > max)
            {
                max = value;
            }
        }
        return max + 1;
    }
}
