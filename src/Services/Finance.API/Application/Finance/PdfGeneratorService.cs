using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace PJT_ERP.Finance.Api.Application.Finance;

public static class PdfGeneratorService
{
    static PdfGeneratorService()
    {
        QuestPDF.Settings.License = LicenseType.Community;
    }

    public static byte[] GenerateInvoicePdf(InvoiceDto invoice)
    {
        var document = Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(PageSizes.A4);
                page.Margin(2, Unit.Centimetre);
                page.PageColor(Colors.White);
                page.DefaultTextStyle(x => x.FontSize(10).FontFamily("Arial"));

                page.Header().Element(header => ComposeHeader(header, invoice));
                page.Content().Element(content => ComposeContent(content, invoice));
                page.Footer().Element(footer => ComposeFooter(footer));
            });
        });

        return document.GeneratePdf();
    }

    private static void ComposeHeader(IContainer container, InvoiceDto invoice)
    {
        container.Row(row =>
        {
            row.RelativeItem().Column(column =>
            {
                column.Item().Text("PT. PRATAMA JAYA").FontSize(20).SemiBold().FontColor(Colors.Grey.Darken4);
                column.Item().Text("Kawasan Industri MM2100").FontSize(10).FontColor(Colors.Grey.Medium);
                column.Item().Text("Cikarang Barat, Bekasi 17530").FontSize(10).FontColor(Colors.Grey.Medium);
                column.Item().Text("finance@pratamajaya.co.id").FontSize(10).FontColor(Colors.Grey.Medium);
            });

            row.ConstantItem(200).Column(column =>
            {
                column.Item().Text("INVOICE").FontSize(36).Black().FontColor(Colors.Grey.Lighten2).AlignRight();
                
                column.Item().PaddingTop(10).Row(r =>
                {
                    r.RelativeItem().Text("Nomor Invoice:").FontColor(Colors.Grey.Medium);
                    r.RelativeItem().Text(invoice.InvoiceNumber).SemiBold().AlignRight();
                });
                column.Item().Row(r =>
                {
                    r.RelativeItem().Text("Tanggal Terbit:").FontColor(Colors.Grey.Medium);
                    r.RelativeItem().Text(invoice.InvoiceDate.ToString("dd MMM yyyy")).SemiBold().AlignRight();
                });
                column.Item().Row(r =>
                {
                    r.RelativeItem().Text("Jatuh Tempo:").FontColor(Colors.Grey.Medium);
                    r.RelativeItem().Text(invoice.DueDate.ToString("dd MMM yyyy")).SemiBold().AlignRight();
                });
            });
        });
    }

    private static void ComposeContent(IContainer container, InvoiceDto invoice)
    {
        container.PaddingVertical(1, Unit.Centimetre).Column(column =>
        {
            column.Spacing(20);

            column.Item().Column(c =>
            {
                c.Item().Text("DITAGIHKAN KEPADA").FontSize(9).Bold().FontColor(Colors.Grey.Medium);
                c.Item().PaddingTop(5).Text(invoice.CustomerName).FontSize(14).Bold().FontColor(Colors.Grey.Darken4);
                c.Item().Text($"Attn: {invoice.CustomerEmail ?? invoice.CustomerCode}").FontSize(11).FontColor(Colors.Grey.Darken2);
            });

            column.Item().Element(tableContainer => ComposeTable(tableContainer, invoice));

            var totalPrice = invoice.TotalAmount;
            
            column.Item().PaddingTop(10).Row(row =>
            {
                row.RelativeItem(3).Column(c =>
                {
                    // Payment Instructions
                    c.Item().Text("Informasi Pembayaran").Bold().FontSize(12).FontColor(Colors.Grey.Darken4);
                    c.Item().PaddingTop(5).Background(Colors.Grey.Lighten4).Padding(10).Column(bc =>
                    {
                        bc.Item().Text("Transfer Ke:").FontSize(9).Bold().FontColor(Colors.Grey.Medium);
                        bc.Item().Text($"{invoice.BankName ?? "Bank BCA"} - {invoice.BankAccountNumber ?? "1234567890"}").FontSize(14).Bold().FontColor(Colors.Red.Darken3);
                        bc.Item().Text($"a/n {invoice.BankAccountName ?? "PT Pratama Jaya"}").FontSize(11).SemiBold().FontColor(Colors.Grey.Darken2);
                    });
                });

                row.RelativeItem(2).PaddingLeft(20).Column(c =>
                {
                    c.Item().BorderBottom(1).BorderColor(Colors.Grey.Lighten2).PaddingBottom(5).Row(r =>
                    {
                        r.RelativeItem().Text("Subtotal").FontColor(Colors.Grey.Darken2);
                        r.RelativeItem().Text(FormatCurrency(invoice.Subtotal)).AlignRight().Bold();
                    });
                    
                    if (invoice.TaxAmount > 0)
                    {
                        c.Item().BorderBottom(1).BorderColor(Colors.Grey.Lighten2).PaddingVertical(5).Row(r =>
                        {
                            r.RelativeItem().Text($"PPN ({invoice.TaxPercent}%)").FontColor(Colors.Grey.Darken2);
                            r.RelativeItem().Text(FormatCurrency(invoice.TaxAmount)).AlignRight().Bold();
                        });
                    }
                    
                    c.Item().PaddingVertical(5).Row(r =>
                    {
                        r.RelativeItem().Text("Grand Total").FontSize(12).Bold();
                        r.RelativeItem().Text(FormatCurrency(invoice.TotalAmount)).FontSize(14).Bold().AlignRight();
                    });

                    // Payment Schedule / DP
                    if (invoice.PaymentSchedules.Count > 0)
                    {
                        var firstSchedule = invoice.PaymentSchedules.First();
                        c.Item().PaddingTop(10).Background(Colors.Grey.Lighten4).Padding(10).Row(r =>
                        {
                            r.RelativeItem().Text(firstSchedule.Label).Bold().FontColor(Colors.Grey.Darken4);
                            r.RelativeItem().Text(FormatCurrency(firstSchedule.Amount)).Bold().FontSize(14).FontColor(Colors.Red.Darken3).AlignRight();
                        });
                    }
                });
            });

            // Area Tanda Tangan / Stamp
            column.Item().PaddingTop(40).Row(row =>
            {
                row.RelativeItem(); // Spacer supaya signature di kanan
                row.ConstantItem(200).Column(c =>
                {
                    c.Item().AlignCenter().Text("Hormat Kami,").FontSize(11).FontColor(Colors.Grey.Darken2);
                    c.Item().Height(70); // Space for signature & stamp
                    c.Item().AlignCenter().Text("PT PRATAMA JAYA").FontSize(11).Bold().FontColor(Colors.Grey.Darken4);
                    c.Item().AlignCenter().Text("Finance Department").FontSize(10).FontColor(Colors.Grey.Medium);
                });
            });
        });
    }

    private static void ComposeTable(IContainer container, InvoiceDto invoice)
    {
        container.Table(table =>
        {
            table.ColumnsDefinition(columns =>
            {
                columns.RelativeColumn(3); // Description
                columns.RelativeColumn(1); // Qty
                columns.RelativeColumn(2); // Unit Price
                columns.RelativeColumn(2); // Total
            });

            table.Header(header =>
            {
                header.Cell().BorderBottom(2).BorderColor(Colors.Grey.Darken4).PaddingBottom(5).Text("Deskripsi Produk / Jasa").FontSize(10).Bold();
                header.Cell().BorderBottom(2).BorderColor(Colors.Grey.Darken4).PaddingBottom(5).AlignRight().Text("Qty").FontSize(10).Bold();
                header.Cell().BorderBottom(2).BorderColor(Colors.Grey.Darken4).PaddingBottom(5).AlignRight().Text("Harga Satuan").FontSize(10).Bold();
                header.Cell().BorderBottom(2).BorderColor(Colors.Grey.Darken4).PaddingBottom(5).AlignRight().Text("Total").FontSize(10).Bold();
            });

            foreach (var item in invoice.Items)
            {
                table.Cell().BorderBottom(1).BorderColor(Colors.Grey.Lighten2).PaddingVertical(5).Text(item.Description).FontSize(10);
                table.Cell().BorderBottom(1).BorderColor(Colors.Grey.Lighten2).PaddingVertical(5).AlignRight().Text(item.Qty.ToString()).FontSize(10);
                table.Cell().BorderBottom(1).BorderColor(Colors.Grey.Lighten2).PaddingVertical(5).AlignRight().Text(FormatCurrency(item.UnitPrice)).FontSize(10);
                table.Cell().BorderBottom(1).BorderColor(Colors.Grey.Lighten2).PaddingVertical(5).AlignRight().Text(FormatCurrency(item.LineTotal)).FontSize(10).Bold();
            }
        });
    }

    private static void ComposeFooter(IContainer container)
    {
        container.Row(row =>
        {
            row.RelativeItem().Column(column =>
            {
                column.Item().Text("Terima kasih atas kerja sama Anda.").FontSize(10).FontColor(Colors.Grey.Darken2).SemiBold();
                column.Item().Text("Dokumen ini dihasilkan oleh Sistem ERP PT Pratama Jaya dan sah tanpa tanda tangan fisik.").FontSize(8).FontColor(Colors.Grey.Medium);
            });
            row.ConstantItem(50).AlignRight().Text(x =>
            {
                x.Span("Page ");
                x.CurrentPageNumber();
                x.Span(" / ");
                x.TotalPages();
            });
        });
    }

    private static string FormatCurrency(decimal amount)
    {
        return $"Rp {amount:N0}";
    }
}
