using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PJT_ERP.Production.Api.Application.MeetingMinutes;
using PJT_ERP.Production.Api.Domain.Entities;
using PJT_ERP.Production.Api.Infrastructure.Persistence;

namespace PJT_ERP.Production.Api.Controllers;

[ApiController]
[Route("api/v1/production/meeting-minutes")]
// Lihat: Sales, Engineering Supervisor, Owner, Finance, Admin. Tulis: hanya Sales & Engineering Supervisor.
[Authorize(Roles = "Sales,Sales Order,Engineering Supervisor,Owner,Finance,Admin")]
public class MeetingMinutesController : ControllerBase
{
    private const string EditorRoles = "Sales,Sales Order,Engineering Supervisor";

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
    [Authorize(Roles = EditorRoles)]
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
    [Authorize(Roles = EditorRoles)]
    public async Task<ActionResult<MeetingMinuteDto>> Update(Guid id, [FromBody] SaveMeetingMinuteRequest request, CancellationToken cancellationToken)
    {
        var entity = await _context.MeetingMinutes.FindAsync([id], cancellationToken);
        if (entity is null) return NotFound();

        var error = Validate(request);
        if (error is not null) return BadRequest(new { message = error });

        Apply(entity, request);
        entity.UpdatedAtUtc = DateTime.UtcNow;
        await _context.SaveChangesAsync(cancellationToken);

        return Ok(ToDto(entity));
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = EditorRoles)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        var entity = await _context.MeetingMinutes.FindAsync([id], cancellationToken);
        if (entity is null) return NotFound();

        _context.MeetingMinutes.Remove(entity);
        await _context.SaveChangesAsync(cancellationToken);

        return NoContent();
    }

    private static string? Validate(SaveMeetingMinuteRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.CustomerName)) return "Nama customer wajib diisi.";
        if (string.IsNullOrWhiteSpace(request.Location)) return "Tempat meeting wajib diisi.";
        if (request.MeetingDate is null) return "Tanggal meeting wajib diisi.";
        if (string.IsNullOrWhiteSpace(request.Discussion)) return "Diskusi / problem wajib diisi.";
        if (request.FeedbackDeadline is not null && request.FeedbackDeadline < request.MeetingDate)
            return "Deadline feedback tidak boleh sebelum tanggal meeting.";
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
        entity.FeedbackDeadline = request.FeedbackDeadline;
    }

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
        FeedbackDeadline = x.FeedbackDeadline,
        CreatedByName = x.CreatedByName,
        CreatedAtUtc = x.CreatedAtUtc,
        UpdatedAtUtc = x.UpdatedAtUtc,
    };
}
