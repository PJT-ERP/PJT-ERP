using System.Buffers;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Http;

namespace PJT_ERP.Shared.Infrastructure.Security;

public static class FileUploadSecurityValidator
{
    private const long MaxFileSizeInBytes = 5 * 1024 * 1024;

    private static readonly HashSet<string> AllowedExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".jpg", ".jpeg", ".png", ".webp", ".pdf"
    };

    private static readonly HashSet<string> AllowedMimeTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "image/jpeg", "image/png", "image/webp", "application/pdf"
    };

    public static async Task ValidateFileAsync(IFormFile file, CancellationToken cancellationToken = default)
    {
        if (file is null || file.Length == 0)
        {
            throw new InvalidOperationException("Uploaded file is empty or null.");
        }

        if (file.Length > MaxFileSizeInBytes)
        {
            throw new InvalidOperationException("Uploaded file exceeds the maximum allowed limit of 5 MB.");
        }

        var extension = Path.GetExtension(file.FileName)?.ToLowerInvariant();
        if (string.IsNullOrWhiteSpace(extension) || !AllowedExtensions.Contains(extension))
        {
            throw new InvalidOperationException($"File extension '{extension}' is not allowed.");
        }

        if (string.IsNullOrWhiteSpace(file.ContentType) || !AllowedMimeTypes.Contains(file.ContentType))
        {
            throw new InvalidOperationException($"File content type '{file.ContentType}' is not allowed.");
        }

        await using var stream = file.OpenReadStream();
        var buffer = ArrayPool<byte>.Shared.Rent(12);
        try
        {
            var bytesRead = await stream.ReadAsync(buffer.AsMemory(0, 12), cancellationToken);
            if (bytesRead < 3 || !IsExtensionSignatureValid(extension, file.ContentType, buffer.AsSpan(0, bytesRead)))
            {
                throw new InvalidOperationException($"File content header (magic numbers) does not match the expected signature for extension '{extension}'.");
            }
        }
        finally
        {
            ArrayPool<byte>.Shared.Return(buffer);
            if (stream.CanSeek)
            {
                stream.Position = 0;
            }
        }
    }

    private static bool IsExtensionSignatureValid(string extension, string contentType, ReadOnlySpan<byte> header)
    {
        return extension switch
        {
            ".jpg" or ".jpeg" =>
                contentType.Equals("image/jpeg", StringComparison.OrdinalIgnoreCase) &&
                header.Length >= 3 && header[0] == 0xFF && header[1] == 0xD8 && header[2] == 0xFF,

            ".png" =>
                contentType.Equals("image/png", StringComparison.OrdinalIgnoreCase) &&
                header.Length >= 4 && header[0] == 0x89 && header[1] == 0x50 && header[2] == 0x4E && header[3] == 0x47,

            ".pdf" =>
                contentType.Equals("application/pdf", StringComparison.OrdinalIgnoreCase) &&
                header.Length >= 4 && header[0] == 0x25 && header[1] == 0x50 && header[2] == 0x44 && header[3] == 0x46,

            ".webp" =>
                contentType.Equals("image/webp", StringComparison.OrdinalIgnoreCase) &&
                header.Length >= 12 &&
                header[0] == 0x52 && header[1] == 0x49 && header[2] == 0x46 && header[3] == 0x46 &&
                header[8] == 0x57 && header[9] == 0x45 && header[10] == 0x42 && header[11] == 0x50,

            _ => false
        };
    }

    public static string SanitizeFileName(string fileName)
    {
        var extension = Path.GetExtension(fileName)?.ToLowerInvariant() ?? "";
        var nameWithoutExtension = Path.GetFileNameWithoutExtension(fileName) ?? "";
        var invalidChars = Path.GetInvalidFileNameChars();
        var safeChars = nameWithoutExtension.Where(c => !invalidChars.Contains(c) && c != '/' && c != '\\').ToArray();
        var cleanName = new string(safeChars).Replace(" ", "-").ToLowerInvariant();
        cleanName = Regex.Replace(cleanName, @"[^a-z0-9\-_]", "");
        if (string.IsNullOrWhiteSpace(cleanName))
        {
            cleanName = "file";
        }
        if (cleanName.Length > 40)
        {
            cleanName = cleanName[..40];
        }
        return $"{cleanName}-{Guid.NewGuid():N}{extension}";
    }

    public static string SanitizePrefix(string input)
    {
        if (string.IsNullOrWhiteSpace(input)) return "ref";
        var clean = Regex.Replace(input, @"[^a-zA-Z0-9\-_]", "-").ToLowerInvariant();
        clean = clean.Trim('-');
        return string.IsNullOrWhiteSpace(clean) ? "ref" : (clean.Length > 30 ? clean[..30] : clean);
    }
}

