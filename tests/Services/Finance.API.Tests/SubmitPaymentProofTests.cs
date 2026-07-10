using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using PJT_ERP.Finance.Api.Application.Finance;
using PJT_ERP.Finance.Api.Domain.Entities;
using PJT_ERP.Finance.Api.Infrastructure.Persistence;

namespace Finance.API.Tests;

public sealed class SubmitPaymentProofTests : IDisposable
{
    private readonly FinanceContext _db;
    private readonly MockWebHostEnvironment _env;
    private readonly FinanceService _service;
    private readonly Guid _invoiceId = Guid.NewGuid();

    public SubmitPaymentProofTests()
    {
        var options = new DbContextOptionsBuilder<FinanceContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        _db = new FinanceContext(options);
        _env = new MockWebHostEnvironment();
        _service = new FinanceService(_db, _env);

        // Seed an invoice with some remaining balance
        var invoice = new Invoice
        {
            Id = _invoiceId,
            InvoiceNumber = "INV/2026/001",
            SalesOrderId = Guid.NewGuid(),
            SalesOrderNumber = "SO-123",
            CustomerId = Guid.NewGuid(),
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
        _db.SaveChanges();
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
    public async Task SubmitPaymentProofAsync_SuccessfullySavesFile_AndReturnsDto()
    {
        // Arrange
        var request = new SubmitPaymentProofFormRequest
        {
            PaymentDate = new DateOnly(2026, 6, 15),
            Amount = 50_000m,
            BankName = "BCA",
            BankReference = "REF-123",
            Notes = "Test notes",
            ProofFile = new MockFormFile("test_proof.jpg", 2048)
        };

        // Act
        var result = await _service.SubmitPaymentProofAsync(_invoiceId, request, CancellationToken.None);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(50_000m, result.Amount);
        Assert.Equal("BCA", result.BankName);
        Assert.Equal("REF-123", result.BankReference);
        Assert.Equal("Test notes", result.Notes);
        Assert.NotNull(result.ProofFileUrl);
        Assert.StartsWith("/proofs/bukti-", result.ProofFileUrl);
        Assert.EndsWith(".jpg", result.ProofFileUrl);
        Assert.Equal("test_proof.jpg", result.ProofFileName);

        // Verify file was written
        var savedFilePath = Path.Combine(_env.WebRootPath, result.ProofFileUrl.TrimStart('/'));
        Assert.True(File.Exists(savedFilePath));
        Assert.Equal(2048, new FileInfo(savedFilePath).Length);
    }

    [Fact]
    public async Task SubmitPaymentProofAsync_NullFile_ThrowsException()
    {
        var request = new SubmitPaymentProofFormRequest
        {
            PaymentDate = new DateOnly(2026, 6, 15),
            Amount = 50_000m,
            ProofFile = null
        };

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() => _service.SubmitPaymentProofAsync(_invoiceId, request, CancellationToken.None));
        Assert.Equal("Payment proof file is required.", ex.Message);
    }

    [Fact]
    public async Task SubmitPaymentProofAsync_EmptyFile_ThrowsException()
    {
        var request = new SubmitPaymentProofFormRequest
        {
            PaymentDate = new DateOnly(2026, 6, 15),
            Amount = 50_000m,
            ProofFile = new MockFormFile("empty.png", 0)
        };

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() => _service.SubmitPaymentProofAsync(_invoiceId, request, CancellationToken.None));
        Assert.Equal("Payment proof file is required.", ex.Message);
    }

    [Fact]
    public async Task SubmitPaymentProofAsync_AmountZero_ThrowsException()
    {
        var request = new SubmitPaymentProofFormRequest
        {
            PaymentDate = new DateOnly(2026, 6, 15),
            Amount = 0m,
            ProofFile = new MockFormFile("valid.jpg", 1024)
        };

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() => _service.SubmitPaymentProofAsync(_invoiceId, request, CancellationToken.None));
        Assert.Equal("Payment amount must be greater than zero.", ex.Message);
    }

    [Fact]
    public async Task SubmitPaymentProofAsync_AmountExceedsRemaining_ThrowsException()
    {
        var request = new SubmitPaymentProofFormRequest
        {
            PaymentDate = new DateOnly(2026, 6, 15),
            Amount = 150_000m, // Invoice total is 110_000m
            ProofFile = new MockFormFile("valid.jpg", 1024)
        };

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() => _service.SubmitPaymentProofAsync(_invoiceId, request, CancellationToken.None));
        Assert.Equal("Payment amount cannot exceed the remaining invoice balance.", ex.Message);
    }

    private sealed class MockWebHostEnvironment : IWebHostEnvironment
    {
        public string WebRootPath { get; set; } = Path.Combine(Path.GetTempPath(), "test-wwwroot-" + Guid.NewGuid());
        public string ApplicationName { get; set; } = "";
        public string ContentRootPath { get; set; } = "";
        public string EnvironmentName { get; set; } = "Test";
        public Microsoft.Extensions.FileProviders.IFileProvider WebRootFileProvider { get; set; } = default!;
        public Microsoft.Extensions.FileProviders.IFileProvider ContentRootFileProvider { get; set; } = default!;
    }

    private sealed class MockFormFile : IFormFile
    {
        private readonly byte[] _content;

        public MockFormFile(string fileName, int length)
        {
            FileName = fileName;
            Length = length;
            _content = new byte[length];
            if (length >= 3 && (fileName.EndsWith(".jpg", StringComparison.OrdinalIgnoreCase) || fileName.EndsWith(".jpeg", StringComparison.OrdinalIgnoreCase)))
            {
                _content[0] = 0xFF;
                _content[1] = 0xD8;
                _content[2] = 0xFF;
            }
            else if (length >= 4 && fileName.EndsWith(".png", StringComparison.OrdinalIgnoreCase))
            {
                _content[0] = 0x89;
                _content[1] = 0x50;
                _content[2] = 0x4E;
                _content[3] = 0x47;
            }
            else if (length >= 4 && fileName.EndsWith(".pdf", StringComparison.OrdinalIgnoreCase))
            {
                _content[0] = 0x25;
                _content[1] = 0x50;
                _content[2] = 0x44;
                _content[3] = 0x46;
            }
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
