using System.Buffers;
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

    private static readonly byte[][] AllowedMagicNumbers =
    [
        [0xFF, 0xD8, 0xFF],
        [0x89, 0x50, 0x4E, 0x47],
        [0x52, 0x49, 0x46, 0x46],
        [0x25, 0x50, 0x44, 0x46]
    ];

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

        var extension = Path.GetExtension(file.FileName);
        if (string.IsNullOrWhiteSpace(extension) || !AllowedExtensions.Contains(extension))
        {
            throw new InvalidOperationException($"File extension '{extension}' is not allowed.");
        }

        if (!AllowedMimeTypes.Contains(file.ContentType))
        {
            throw new InvalidOperationException($"File content type '{file.ContentType}' is not allowed.");
        }

        await using var stream = file.OpenReadStream();
        var buffer = ArrayPool<byte>.Shared.Rent(8);
        try
        {
            var bytesRead = await stream.ReadAsync(buffer.AsMemory(0, 8), cancellationToken);
            if (bytesRead < 3 || !IsMagicNumberValid(buffer.AsSpan(0, bytesRead)))
            {
                throw new InvalidOperationException("File content header (magic numbers) does not match any allowed file type.");
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

    private static bool IsMagicNumberValid(ReadOnlySpan<byte> header)
    {
        foreach (var magic in AllowedMagicNumbers)
        {
            if (header.Length >= magic.Length && header[..magic.Length].SequenceEqual(magic))
            {
                if (magic.Length == 4 && magic[0] == 0x52 && magic[1] == 0x49 && magic[2] == 0x46 && magic[3] == 0x46)
                {
                    if (header.Length >= 12 && header[8] == 0x57 && header[9] == 0x45 && header[10] == 0x42 && header[11] == 0x50)
                    {
                        return true;
                    }
                    continue;
                }
                return true;
            }
        }
        return false;
    }

    public static string SanitizeFileName(string fileName)
    {
        var extension = Path.GetExtension(fileName);
        var nameWithoutExtension = Path.GetFileNameWithoutExtension(fileName);
        var invalidChars = Path.GetInvalidFileNameChars();
        var safeChars = nameWithoutExtension.Where(c => !invalidChars.Contains(c) && c != '/' && c != '\\').ToArray();
        var cleanName = new string(safeChars).Replace(" ", "-").ToLowerInvariant();
        if (string.IsNullOrWhiteSpace(cleanName))
        {
            cleanName = "file";
        }
        return $"{cleanName}-{Guid.NewGuid():N}{extension.ToLowerInvariant()}";
    }
}
