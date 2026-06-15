using PJT_ERP.Finance.Api.Application.Finance;
using PJT_ERP.Finance.Api.Domain.Entities;

namespace Finance.API.Tests;

public sealed class PdfGeneratorServiceTests
{
    [Fact]
    public void GenerateInvoicePdf_ReturnsValidPdfBytes()
    {
        // Arrange
        var invoice = new InvoiceDto(
            Id: Guid.NewGuid(),
            InvoiceNumber: "INV-2026-001",
            SalesOrderId: Guid.NewGuid(),
            SalesOrderNumber: "SO-12345",
            CustomerId: Guid.NewGuid(),
            CustomerCode: "CUST-1",
            CustomerName: "PT Budi Sejahtera",
            CustomerEmail: "budi@example.com",
            InvoiceDate: new DateOnly(2026, 6, 1),
            DueDate: new DateOnly(2026, 6, 30),
            Subtotal: 1_000_000m,
            TaxPercent: 11m,
            TaxAmount: 110_000m,
            TotalAmount: 1_110_000m,
            PaidAmount: 0m,
            RemainingAmount: 1_110_000m,
            PaymentPercent: 0m,
            Status: "Unpaid",
            BankName: "BCA",
            BankAccountName: "PT PJT",
            BankAccountNumber: "1234567890",
            Items:
            [
                new InvoiceItemDto(
                    SalesOrderItemId: Guid.NewGuid(),
                    ProductId: Guid.NewGuid(),
                    PartNumber: "PN-001",
                    Description: "Engine Block",
                    Qty: 2,
                    UnitPrice: 500_000m,
                    LineTotal: 1_000_000m
                )
            ],
            PaymentSchedules:
            [
                new PaymentScheduleDto(
                    Id: Guid.NewGuid(),
                    Label: "DP 50%",
                    Percentage: 50m,
                    Amount: 555_000m,
                    DueDate: new DateOnly(2026, 6, 10),
                    IsPaid: false
                )
            ],
            Payments: [],
            CollectionLetters: []
        );

        // Act
        var pdfBytes = PdfGeneratorService.GenerateInvoicePdf(invoice);

        // Assert
        Assert.NotNull(pdfBytes);
        Assert.NotEmpty(pdfBytes);
        
        // PDF Magic Number: %PDF-
        Assert.True(pdfBytes.Length > 5);
        Assert.Equal((byte)'%', pdfBytes[0]);
        Assert.Equal((byte)'P', pdfBytes[1]);
        Assert.Equal((byte)'D', pdfBytes[2]);
        Assert.Equal((byte)'F', pdfBytes[3]);
        Assert.Equal((byte)'-', pdfBytes[4]);
    }

    [Fact]
    public void GenerateInvoicePdf_WithNoItemsAndNoSchedules_StillGeneratesPdf()
    {
        // Arrange
        var invoice = new InvoiceDto(
            Id: Guid.NewGuid(),
            InvoiceNumber: "INV-2026-002",
            SalesOrderId: Guid.NewGuid(),
            SalesOrderNumber: "SO-12346",
            CustomerId: Guid.NewGuid(),
            CustomerCode: "CUST-2",
            CustomerName: "PT Customer Kosong",
            CustomerEmail: "kosong@example.com",
            InvoiceDate: new DateOnly(2026, 6, 15),
            DueDate: new DateOnly(2026, 6, 30),
            Subtotal: 0m,
            TaxPercent: 11m,
            TaxAmount: 0m,
            TotalAmount: 0m,
            PaidAmount: 0m,
            RemainingAmount: 0m,
            PaymentPercent: 0m,
            Status: "Unpaid",
            BankName: null,
            BankAccountName: null,
            BankAccountNumber: null,
            Items: [],
            PaymentSchedules: [],
            Payments: [],
            CollectionLetters: []
        );

        // Act
        var pdfBytes = PdfGeneratorService.GenerateInvoicePdf(invoice);

        // Assert
        Assert.NotNull(pdfBytes);
        Assert.NotEmpty(pdfBytes);
        
        // Verify it's a PDF
        Assert.Equal((byte)'%', pdfBytes[0]);
    }
}
