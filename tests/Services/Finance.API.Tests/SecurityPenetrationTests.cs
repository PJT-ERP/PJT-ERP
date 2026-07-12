using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using PJT_ERP.EventBus.Messages.Events;
using PJT_ERP.Finance.Api.Application.Finance;
using PJT_ERP.Finance.Api.Application.IntegrationEvents;
using PJT_ERP.Finance.Api.Domain.Entities;
using PJT_ERP.Finance.Api.Infrastructure.Persistence;

namespace Finance.API.Tests;

public sealed class SecurityPenetrationTests : IDisposable
{
    private readonly FinanceContext _db;
    private readonly MockWebHostEnvironment _env;
    private readonly FinanceService _service;
    private static readonly Guid SalesOrderId = Guid.NewGuid();
    private static readonly Guid CustomerId = Guid.NewGuid();

    public SecurityPenetrationTests()
    {
        var options = new DbContextOptionsBuilder<FinanceContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        _db = new FinanceContext(options);
        _env = new MockWebHostEnvironment();
        _service = new FinanceService(_db, _env);
    }

    public void Dispose()
    {
        _db.Dispose();
        if (Directory.Exists(_env.WebRootPath))
        {
            Directory.Delete(_env.WebRootPath, true);
        }
    }

    [Fact]
    public async Task Pentest_PriceTampering_ClientPayloadManipulation_ThrowsSecurityAlert()
    {
        var handler = new SalesOrderReadyForInvoiceEventHandler(_db);
        var itemId = Guid.NewGuid();
        var readyEvent = new SalesOrderReadyForInvoiceEvent(
            SalesOrderId,
            "SO-TAMPER-001",
            CustomerId,
            "CUST-HACKER",
            "PT Attacker",
            "hacker@evil.com",
            new DateOnly(2026, 7, 30),
            DateTime.UtcNow,
            [
                new SalesOrderReadyForInvoiceItem(
                    itemId,
                    Guid.NewGuid(),
                    "PART-001",
                    "High Grade Shaft",
                    2,
                    100_000m)
            ]);
        await handler.Handle(readyEvent, CancellationToken.None);

        var request = new CreateInvoiceRequest(
            SalesOrderId,
            new DateOnly(2026, 6, 1),
            new DateOnly(2026, 6, 30),
            2m,
            [
                new CreateInvoiceItemPrice(itemId, 1m)
            ],
            [
                new CreatePaymentScheduleRequest("Pelunasan 100%", 100, new DateOnly(2026, 6, 30))
            ],
            "Simulating price manipulation payload",
            null,
            null,
            null);

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            _service.CreateInvoiceAsync(request, CancellationToken.None));

        Assert.Contains("Price tampering detected", ex.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task Pentest_FileUpload_PhpScriptUpload_ThrowsInvalidOperationException()
    {
        var invoice = new Invoice
        {
            Id = Guid.NewGuid(),
            InvoiceNumber = "INV/2026/002",
            SalesOrderId = SalesOrderId,
            SalesOrderNumber = "SO-TAMPER-001",
            CustomerId = CustomerId,
            CustomerCode = "CUST-1",
            CustomerName = "PT Cust",
            CustomerEmail = "cust@example.com",
            InvoiceDate = new DateOnly(2026, 6, 1),
            DueDate = new DateOnly(2026, 6, 30),
            Subtotal = 100_000m,
            TaxAmount = 10_000m,
            TotalAmount = 110_000m,
            PaidAmount = 0m,
            PaymentPercent = 0m
        };
        _db.Invoices.Add(invoice);
        await _db.SaveChangesAsync();

        var phpPayload = new byte[] { 0x3C, 0x3F, 0x70, 0x68, 0x70, 0x20, 0x65, 0x63, 0x68, 0x6F, 0x20, 0x31, 0x3B, 0x3F, 0x3E };
        var spoofedFile = new PentestFormFile("webshell.php", phpPayload);

        var request = new SubmitPaymentProofFormRequest
        {
            PaymentDate = new DateOnly(2026, 6, 15),
            Amount = 50_000m,
            BankName = "BCA",
            BankReference = "REF-HACK-001",
            Notes = "Pentest upload PHP shell",
            ProofFile = spoofedFile
        };

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            _service.SubmitPaymentProofAsync(invoice.Id, request, CancellationToken.None));

        Assert.Contains("File extension '.php' is not allowed", ex.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task Pentest_FileUpload_SpoofedJpgExtensionWithFakeBytes_ThrowsInvalidOperationException()
    {
        var invoice = new Invoice
        {
            Id = Guid.NewGuid(),
            InvoiceNumber = "INV/2026/003",
            SalesOrderId = SalesOrderId,
            SalesOrderNumber = "SO-TAMPER-001",
            CustomerId = CustomerId,
            CustomerCode = "CUST-1",
            CustomerName = "PT Cust",
            CustomerEmail = "cust@example.com",
            InvoiceDate = new DateOnly(2026, 6, 1),
            DueDate = new DateOnly(2026, 6, 30),
            Subtotal = 100_000m,
            TaxAmount = 10_000m,
            TotalAmount = 110_000m,
            PaidAmount = 0m,
            PaymentPercent = 0m
        };
        _db.Invoices.Add(invoice);
        await _db.SaveChangesAsync();

        var fakeBytes = new byte[] { 0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09 };
        var spoofedFile = new PentestFormFile("fake_image.jpg", fakeBytes);

        var request = new SubmitPaymentProofFormRequest
        {
            PaymentDate = new DateOnly(2026, 6, 15),
            Amount = 50_000m,
            BankName = "BCA",
            BankReference = "REF-HACK-002",
            Notes = "Pentest upload spoofed extension",
            ProofFile = spoofedFile
        };

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            _service.SubmitPaymentProofAsync(invoice.Id, request, CancellationToken.None));

        Assert.Contains("magic numbers", ex.Message, StringComparison.OrdinalIgnoreCase);
    }

    private sealed class MockWebHostEnvironment : IWebHostEnvironment
    {
        public string WebRootPath { get; set; } = Path.Combine(Path.GetTempPath(), "pentest-wwwroot-" + Guid.NewGuid());
        public string ApplicationName { get; set; } = "";
        public string ContentRootPath { get; set; } = "";
        public string EnvironmentName { get; set; } = "Test";
        public Microsoft.Extensions.FileProviders.IFileProvider WebRootFileProvider { get; set; } = default!;
        public Microsoft.Extensions.FileProviders.IFileProvider ContentRootFileProvider { get; set; } = default!;
    }

    private sealed class PentestFormFile : IFormFile
    {
        private readonly byte[] _content;

        public PentestFormFile(string fileName, byte[] content)
        {
            FileName = fileName;
            Length = content.Length;
            _content = content;
        }

        public string ContentType => "image/jpeg";
        public string ContentDisposition => "form-data";
        public IHeaderDictionary Headers => new HeaderDictionary();
        public long Length { get; }
        public string Name => "file";
        public string FileName { get; }

        public Stream OpenReadStream() => new MemoryStream(_content);
        public void CopyTo(Stream target) => OpenReadStream().CopyTo(target);
        public Task CopyToAsync(Stream target, CancellationToken cancellationToken = default) => OpenReadStream().CopyToAsync(target, cancellationToken);
    }
}
