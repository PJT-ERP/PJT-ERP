using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PJT_ERP.Production.Api.Application.MeetingMinutes;
using PJT_ERP.Production.Api.Domain.Entities;
using PJT_ERP.Production.Api.Infrastructure.Persistence;
using PJT_ERP.Shared.Infrastructure.Security;

namespace PJT_ERP.Production.Api.Controllers;

[ApiController]
[Route("api/v1/production/meeting-minutes")]
// Semua user yang login boleh melihat, menambah, mengubah, dan menghapus minute meeting.
[Authorize]
public class MeetingMinutesController : ControllerBase
{
    private const string FilesFolder = "meeting-minutes";
    private const string FilesRoute = "/api/v1/production/meeting-minutes/files/";

    private readonly ProductionContext _context;

    public MeetingMinutesController(ProductionContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<MeetingMinuteDto>>> GetAll(CancellationToken cancellationToken)
    {
        var minutes = await _context.MeetingMinutes
            .AsNoTracking()
            .OrderByDescending(x => x.MeetingDate)
            .ThenByDescending(x => x.CreatedAtUtc)
            .ToListAsync(cancellationToken);

        return Ok(minutes.Select(ToDto).ToList());
    }

    [HttpPost]
    public async Task<ActionResult<MeetingMinuteDto>> Create([FromBody] SaveMeetingMinuteRequest request, CancellationToken cancellationToken)
    {
        var error = Validate(request);
        if (error is not null) return BadRequest(new { message = error });

        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var entity = new MeetingMinute
        {
            CreatedByUserId = Guid.TryParse(userIdString, out var userId) ? userId : null,
            CreatedByName = User.FindFirstValue(ClaimTypes.Name) ?? string.Empty,
        };
        Apply(entity, request);

        _context.MeetingMinutes.Add(entity);
        await _context.SaveChangesAsync(cancellationToken);

        return Ok(ToDto(entity));
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<MeetingMinuteDto>> Update(Guid id, [FromBody] SaveMeetingMinuteRequest request, CancellationToken cancellationToken)
    {
        var entity = await _context.MeetingMinutes.FindAsync([id], cancellationToken);
        if (entity is null) return NotFound();

        var error = Validate(request);
        if (error is not null) return BadRequest(new { message = error });

        Apply(entity, request);
        entity.UpdatedAtUtc = DateTime.UtcNow;
        entity.UpdatedByUserId = Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var userId) ? userId : null;
        entity.UpdatedByName = User.FindFirstValue(ClaimTypes.Name) ?? string.Empty;
        await _context.SaveChangesAsync(cancellationToken);

        return Ok(ToDto(entity));
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        var entity = await _context.MeetingMinutes.FindAsync([id], cancellationToken);
        if (entity is null) return NotFound();

        _context.MeetingMinutes.Remove(entity);
        await _context.SaveChangesAsync(cancellationToken);

        return NoContent();
    }

    [HttpPost("upload-file")]
    public async Task<ActionResult<object>> UploadFile(
        [FromForm] IFormFile file,
        [FromServices] IWebHostEnvironment env,
        CancellationToken cancellationToken)
    {
        if (file is null || file.Length == 0)
        {
            return BadRequest(new { message = "File belum dipilih." });
        }

        if (!string.Equals(Path.GetExtension(file.FileName), ".pdf", StringComparison.OrdinalIgnoreCase))
        {
            return BadRequest(new { message = "Hasil meeting harus berupa file PDF." });
        }

        try
        {
            await FileUploadSecurityValidator.ValidateFileAsync(file, cancellationToken);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }

        var uploadsFolder = GetUploadsFolder(env);
        Directory.CreateDirectory(uploadsFolder);

        var uniqueFileName = FileUploadSecurityValidator.SanitizeFileName(file.FileName);
        var fullPath = Path.GetFullPath(Path.Combine(uploadsFolder, uniqueFileName));
        if (!fullPath.StartsWith(Path.GetFullPath(uploadsFolder) + Path.DirectorySeparatorChar, StringComparison.Ordinal))
        {
            return BadRequest(new { message = "Invalid upload path." });
        }

        await using (var stream = new FileStream(fullPath, FileMode.Create))
        {
            await file.CopyToAsync(stream, cancellationToken);
        }

        return Ok(new { url = FilesRoute + uniqueFileName, fileName = Path.GetFileName(file.FileName) });
    }

    [HttpGet("files/{fileName}")]
    public IActionResult GetFile(string fileName, [FromServices] IWebHostEnvironment env)
    {
        var safeFileName = Path.GetFileName(fileName ?? string.Empty);
        if (string.IsNullOrWhiteSpace(safeFileName))
        {
            return BadRequest(new { message = "File name is required." });
        }

        var uploadsFolder = GetUploadsFolder(env);
        var fullPath = Path.GetFullPath(Path.Combine(uploadsFolder, safeFileName));
        if (!fullPath.StartsWith(Path.GetFullPath(uploadsFolder) + Path.DirectorySeparatorChar, StringComparison.Ordinal))
        {
            return BadRequest(new { message = "Invalid path traversal attempt." });
        }

        if (!System.IO.File.Exists(fullPath))
        {
            return NotFound(new { message = "File hasil meeting tidak ditemukan." });
        }

        Response.Headers.Append("X-Content-Type-Options", "nosniff");
        Response.Headers.Append("Cache-Control", "private, no-cache, no-store, must-revalidate");

        return PhysicalFile(fullPath, "application/pdf");
    }

    private static string GetUploadsFolder(IWebHostEnvironment env) => Path.Combine(
        env.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot"),
        FilesFolder);

    private static string? Validate(SaveMeetingMinuteRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.CustomerName)) return "Nama customer wajib diisi.";
        if (string.IsNullOrWhiteSpace(request.Location)) return "Tempat meeting wajib diisi.";
        if (request.MeetingDate is null) return "Tanggal meeting wajib diisi.";
        if (string.IsNullOrWhiteSpace(request.Participants)) return "Peserta meeting wajib diisi.";
        if (string.IsNullOrWhiteSpace(request.Discussion)) return "Diskusi / problem wajib diisi.";
        if (request.FeedbackDeadline is not null && request.FeedbackDeadline < request.MeetingDate)
            return "Deadline feedback tidak boleh sebelum tanggal meeting.";
        if (!string.IsNullOrWhiteSpace(request.ResultFileUrl) && !request.ResultFileUrl.StartsWith(FilesRoute, StringComparison.Ordinal))
            return "File hasil meeting tidak valid.";
        return null;
    }

    private static void Apply(MeetingMinute entity, SaveMeetingMinuteRequest request)
    {
        entity.CustomerId = request.CustomerId;
        entity.CustomerName = request.CustomerName.Trim();
        entity.Location = request.Location.Trim();
        entity.MeetingDate = request.MeetingDate!.Value;
        entity.Description = request.Description?.Trim() ?? string.Empty;
        entity.Discussion = request.Discussion.Trim();
        entity.Solution = request.Solution?.Trim() ?? string.Empty;
        entity.Participants = request.Participants.Trim();
        var hasFile = !string.IsNullOrWhiteSpace(request.ResultFileUrl);
        entity.ResultFileUrl = hasFile ? request.ResultFileUrl : null;
        entity.ResultFileName = hasFile ? Truncate(request.ResultFileName?.Trim(), 255) : null;
        entity.FeedbackDeadline = request.FeedbackDeadline;
    }

    private static string? Truncate(string? value, int maxLength) =>
        value is null || value.Length <= maxLength ? value : value[..maxLength];

    private static MeetingMinuteDto ToDto(MeetingMinute x) => new()
    {
        Id = x.Id,
        CustomerId = x.CustomerId,
        CustomerName = x.CustomerName,
        Location = x.Location,
        MeetingDate = x.MeetingDate,
        Description = x.Description,
        Discussion = x.Discussion,
        Solution = x.Solution,
        Participants = x.Participants,
        ResultFileUrl = x.ResultFileUrl,
        ResultFileName = x.ResultFileName,
        FeedbackDeadline = x.FeedbackDeadline,
        CreatedByName = x.CreatedByName,
        CreatedAtUtc = x.CreatedAtUtc,
        UpdatedAtUtc = x.UpdatedAtUtc,
        UpdatedByName = x.UpdatedByName,
    };
}
