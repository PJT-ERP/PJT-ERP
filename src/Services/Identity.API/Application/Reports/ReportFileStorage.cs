using Microsoft.AspNetCore.Http;

namespace PJT_ERP.Identity.Api.Application.Reports;

public interface IReportFileStorage
{
    Task<string> SaveAsync(IFormFile file, CancellationToken cancellationToken);
    Stream OpenRead(string storedFilePath);
    void Delete(string storedFilePath);
}

public sealed class LocalReportFileStorage(IConfiguration configuration, IWebHostEnvironment environment) : IReportFileStorage
{
    private const long MaxFileSize = 5 * 1024 * 1024;
    private static readonly IReadOnlyDictionary<string, byte[][]> Signatures = new Dictionary<string, byte[][]>(StringComparer.OrdinalIgnoreCase)
    {
        ["image/jpeg"] = [[0xFF, 0xD8, 0xFF]],
        ["image/png"] = [[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]],
        ["image/webp"] = [[0x52, 0x49, 0x46, 0x46]]
    };

    private readonly string _rootPath = Path.GetFullPath(configuration["DailyReportUploads:RootPath"]
        ?? Path.Combine(environment.ContentRootPath, "App_Data", "daily-report-uploads"));

    public async Task<string> SaveAsync(IFormFile file, CancellationToken cancellationToken)
    {
        Validate(file);
        Directory.CreateDirectory(_rootPath);
        var extension = file.ContentType.ToLowerInvariant() switch
        {
            "image/jpeg" => ".jpg",
            "image/png" => ".png",
            "image/webp" => ".webp",
            _ => throw new DailyReportValidationException("Unsupported image type.")
        };
        var storedFileName = $"{Guid.NewGuid():N}{extension}";
        var destination = GetPath(storedFileName);
        await using var output = File.Create(destination);
        await file.CopyToAsync(output, cancellationToken);
        return storedFileName;
    }

    public Stream OpenRead(string storedFilePath) => File.OpenRead(GetPath(storedFilePath));
    public void Delete(string storedFilePath)
    {
        var path = GetPath(storedFilePath);
        if (File.Exists(path)) File.Delete(path);
    }

    private void Validate(IFormFile file)
    {
        if (file.Length is <= 0 or > MaxFileSize) throw new DailyReportValidationException("Each image must be between 1 byte and 5 MB.");
        if (!Signatures.ContainsKey(file.ContentType)) throw new DailyReportValidationException("Only JPG, PNG, and WEBP images are allowed.");
        using var input = file.OpenReadStream();
        var header = new byte[12];
        var read = input.Read(header, 0, header.Length);
        var signature = Signatures[file.ContentType];
        if (read < signature[0].Length || !header.AsSpan(0, signature[0].Length).SequenceEqual(signature[0]))
            throw new DailyReportValidationException("The uploaded file content does not match its image type.");
        if (string.Equals(file.ContentType, "image/webp", StringComparison.OrdinalIgnoreCase)
            && (read < 12 || !header.AsSpan(8, 4).SequenceEqual("WEBP"u8)))
            throw new DailyReportValidationException("The uploaded file content does not match its image type.");
    }

    private string GetPath(string storedFilePath)
    {
        var fileName = Path.GetFileName(storedFilePath);
        if (!string.Equals(fileName, storedFilePath, StringComparison.Ordinal) || string.IsNullOrWhiteSpace(fileName))
            throw new InvalidOperationException("Invalid stored report attachment path.");
        return Path.Combine(_rootPath, fileName);
    }
}
