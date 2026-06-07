using Microsoft.EntityFrameworkCore;
using PJT_ERP.Finance.Api.Domain.Entities;
using PJT_ERP.Finance.Api.Infrastructure.Persistence;

namespace PJT_ERP.Finance.Api.Application.Finance;

public sealed class FinanceService(FinanceContext db) : IFinanceService
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
            .FirstOrDefaultAsync(candidate => candidate.SalesOrderId == request.SalesOrderId, cancellationToken)
            ?? throw new InvalidOperationException("Sales order is not ready for invoice yet.");

        if (candidate.Status == InvoiceCandidateStatuses.Invoiced
            || await db.Invoices.AnyAsync(invoice => invoice.SalesOrderId == request.SalesOrderId, cancellationToken))
        {
            throw new InvalidOperationException("This sales order already has an invoice.");
        }

        var prices = request.Items.ToDictionary(item => item.SalesOrderItemId, item => item.UnitPrice);
        if (prices.Count != candidate.Items.Count || candidate.Items.Any(item => !prices.ContainsKey(item.SalesOrderItemId)))
        {
            throw new InvalidOperationException("Invoice item prices must match all sales order items.");
        }

        var invoiceItems = candidate.Items
            .OrderBy(item => item.ProductPartNumber)
            .Select(item =>
            {
                var unitPrice = RoundMoney(prices[item.SalesOrderItemId]);
                return new InvoiceItem
                {
                    SalesOrderItemId = item.SalesOrderItemId,
                    ProductId = item.ProductId,
                    PartNumber = item.ProductPartNumber,
                    Description = item.ProductDescription,
                    Qty = item.Qty,
                    UnitPrice = unitPrice,
                    LineTotal = RoundMoney(unitPrice * item.Qty)
                };
            })
            .ToList();

        var subtotal = RoundMoney(invoiceItems.Sum(item => item.LineTotal));
        var taxAmount = RoundMoney(subtotal * request.TaxPercent / 100);
        var totalAmount = RoundMoney(subtotal + taxAmount);

        var paymentSchedules = BuildPaymentSchedules(request, totalAmount);
        var invoice = new Invoice
        {
            InvoiceNumber = GenerateNumber("INV"),
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
        if (request.Amount <= 0)
        {
            throw new InvalidOperationException("Payment amount must be greater than zero.");
        }

        var invoice = await db.Invoices
            .FirstOrDefaultAsync(invoice => invoice.Id == invoiceId, cancellationToken);

        if (invoice is null)
        {
            return null;
        }

        var remaining = RoundMoney(invoice.TotalAmount - invoice.PaidAmount);
        if (request.Amount > remaining)
        {
            throw new InvalidOperationException("Payment amount cannot exceed the remaining invoice balance.");
        }

        await db.PaymentRecords.AddAsync(new PaymentRecord
        {
            InvoiceId = invoice.Id,
            PaymentDate = request.PaymentDate,
            Amount = RoundMoney(request.Amount),
            Notes = NormalizeOptional(request.Notes)
        }, cancellationToken);

        invoice.PaidAmount = RoundMoney(invoice.PaidAmount + request.Amount);
        invoice.PaymentPercent = invoice.TotalAmount == 0
            ? 100
            : decimal.Round(invoice.PaidAmount / invoice.TotalAmount * 100, 2);
        invoice.Status = invoice.PaidAmount >= invoice.TotalAmount
            ? InvoiceStatuses.Paid
            : InvoiceStatuses.PartiallyPaid;
        invoice.UpdatedAtUtc = DateTime.UtcNow;

        await db.SaveChangesAsync(cancellationToken);

        return await GetInvoiceAsync(invoice.Id, cancellationToken);
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

        await db.CollectionLetters.AddAsync(new CollectionLetter
        {
            InvoiceId = invoice.Id,
            LetterNumber = GenerateNumber("COL"),
            IssuedDate = request.IssuedDate,
            DueDate = request.DueDate,
            Notes = NormalizeOptional(request.Notes)
        }, cancellationToken);
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

    private static IQueryable<Invoice> IncludeInvoice(IQueryable<Invoice> query)
    {
        return query
            .Include(invoice => invoice.Items)
            .Include(invoice => invoice.PaymentSchedules)
            .Include(invoice => invoice.Payments)
            .Include(invoice => invoice.CollectionLetters);
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
                    item.Qty))
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

    private static string GenerateNumber(string prefix)
    {
        return $"{prefix}-{DateTime.UtcNow:yyyyMMddHHmmss}-{Guid.NewGuid():N}"[..(prefix.Length + 24)].ToUpperInvariant();
    }
}
