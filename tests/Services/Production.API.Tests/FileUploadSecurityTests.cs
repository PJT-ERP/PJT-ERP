using Microsoft.AspNetCore.Http;
using PJT_ERP.Shared.Infrastructure.Security;
using System.IO;
using System.Text;
using Xunit;

namespace Production.API.Tests;

public sealed class FileUploadSecurityTests
{
    private static IFormFile CreateFormFile(string fileName, string contentType, byte[] content)
    {
        var stream = new MemoryStream(content);
        return new FormFile(stream, 0, content.Length, "file", fileName)
        {
            Headers = new HeaderDictionary(),
            ContentType = contentType
        };
    }

    [Fact]
    public async Task ValidateFileAsync_ValidJpegFile_PassesValidation()
    {
        // JPEG magic bytes: FF D8 FF
        byte[] jpegHeader = [0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46];
        var file = CreateFormFile("photo.jpg", "image/jpeg", jpegHeader);

        await FileUploadSecurityValidator.ValidateFileAsync(file);
    }

    [Fact]
    public async Task ValidateFileAsync_ValidPngFile_PassesValidation()
    {
        // PNG magic bytes: 89 50 4E 47
        byte[] pngHeader = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
        var file = CreateFormFile("image.png", "image/png", pngHeader);

        await FileUploadSecurityValidator.ValidateFileAsync(file);
    }

    [Fact]
    public async Task ValidateFileAsync_ValidPdfFile_PassesValidation()
    {
        // PDF magic bytes: %PDF (25 50 44 46)
        byte[] pdfHeader = Encoding.UTF8.GetBytes("%PDF-1.7 header content here");
        var file = CreateFormFile("doc.pdf", "application/pdf", pdfHeader);

        await FileUploadSecurityValidator.ValidateFileAsync(file);
    }

    [Fact]
    public async Task ValidateFileAsync_ValidWebpFile_PassesValidation()
    {
        // WEBP magic bytes: RIFF (52 49 46 46) ... WEBP (57 45 42 50)
        byte[] webpHeader = [0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50];
        var file = CreateFormFile("graphic.webp", "image/webp", webpHeader);

        await FileUploadSecurityValidator.ValidateFileAsync(file);
    }

    [Theory]
    [InlineData("malicious.html", "text/html")]
    [InlineData("malicious.svg", "image/svg+xml")]
    [InlineData("malicious.js", "application/javascript")]
    [InlineData("malicious.exe", "application/x-msdownload")]
    [InlineData("script.php", "application/x-httpd-php")]
    public async Task ValidateFileAsync_DisallowedExtensions_ThrowsInvalidOperationException(string fileName, string contentType)
    {
        byte[] content = Encoding.UTF8.GetBytes("<html><script>alert(1)</script></html>");
        var file = CreateFormFile(fileName, contentType, content);

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() => FileUploadSecurityValidator.ValidateFileAsync(file));
        Assert.Contains("not allowed", ex.Message);
    }

    [Fact]
    public async Task ValidateFileAsync_PdfExtensionWithJpegMagicBytes_ThrowsInvalidOperationException()
    {
        // .pdf extension with JPEG magic bytes (FF D8 FF)
        byte[] jpegContent = [0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10];
        var file = CreateFormFile("fake.pdf", "application/pdf", jpegContent);

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() => FileUploadSecurityValidator.ValidateFileAsync(file));
        Assert.Contains("does not match the expected signature", ex.Message);
    }

    [Fact]
    public async Task ValidateFileAsync_PngExtensionWithPdfMagicBytes_ThrowsInvalidOperationException()
    {
        // .png extension with PDF magic bytes (%PDF)
        byte[] pdfContent = Encoding.UTF8.GetBytes("%PDF-1.4 fake pdf data");
        var file = CreateFormFile("fake.png", "image/png", pdfContent);

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() => FileUploadSecurityValidator.ValidateFileAsync(file));
        Assert.Contains("does not match the expected signature", ex.Message);
    }

    [Fact]
    public async Task ValidateFileAsync_JpgExtensionWithPngMagicBytes_ThrowsInvalidOperationException()
    {
        // .jpg extension with PNG magic bytes
        byte[] pngContent = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
        var file = CreateFormFile("fake.jpg", "image/jpeg", pngContent);

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() => FileUploadSecurityValidator.ValidateFileAsync(file));
        Assert.Contains("does not match the expected signature", ex.Message);
    }

    [Fact]
    public async Task ValidateFileAsync_OversizedFile_ThrowsInvalidOperationException()
    {
        byte[] largeBytes = new byte[5 * 1024 * 1024 + 1];
        largeBytes[0] = 0xFF; largeBytes[1] = 0xD8; largeBytes[2] = 0xFF;
        var file = CreateFormFile("huge.jpg", "image/jpeg", largeBytes);

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() => FileUploadSecurityValidator.ValidateFileAsync(file));
        Assert.Contains("exceeds the maximum allowed limit", ex.Message);
    }

    [Fact]
    public async Task ValidateFileAsync_EmptyFile_ThrowsInvalidOperationException()
    {
        var file = CreateFormFile("empty.jpg", "image/jpeg", Array.Empty<byte>());

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() => FileUploadSecurityValidator.ValidateFileAsync(file));
        Assert.Contains("empty or null", ex.Message);
    }

    [Theory]
    [InlineData("../../../etc/passwd", "etc-passwd")]
    [InlineData("..\\..\\secret.txt", "secret-txt")]
    [InlineData("PO/2026/06/001", "po-2026-06-001")]
    [InlineData("INV-001; DROP TABLE Users;", "inv-001--drop-table-users")]
    public void SanitizePrefix_RemovesPathTraversalAndSpecialCharacters(string input, string expectedSubstring)
    {
        var result = FileUploadSecurityValidator.SanitizePrefix(input);

        Assert.DoesNotContain("/", result);
        Assert.DoesNotContain("\\", result);
        Assert.DoesNotContain("..", result);
        Assert.Contains(expectedSubstring, result);
    }
}
