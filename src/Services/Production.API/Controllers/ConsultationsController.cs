using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using PJT_ERP.Production.Api.Application.Consultations;
using PJT_ERP.Production.Api.Domain.Entities;
using PJT_ERP.Production.Api.Infrastructure.Persistence;

namespace PJT_ERP.Production.Api.Controllers;

[ApiController]
[Route("api/v1/production/[controller]")]
public class ConsultationsController : ControllerBase
{
    private readonly ProductionContext _context;

    public ConsultationsController(ProductionContext context)
    {
        _context = context;
    }

    [HttpPost]
    [AllowAnonymous]
    [EnableRateLimiting("public")]
    public async Task<IActionResult> SubmitConsultation([FromBody] CreateConsultationRequest request)
    {
        var entity = new ConsultationRequest
        {
            Name = request.Name,
            Phone = request.Phone,
            Email = request.Email,
            ServiceDescription = request.ServiceDescription,
            Message = request.Message
        };

        _context.ConsultationRequests.Add(entity);
        await _context.SaveChangesAsync();

        return Ok(new ConsultationDto
        {
            Id = entity.Id,
            Name = entity.Name,
            Phone = entity.Phone,
            Email = entity.Email,
            ServiceDescription = entity.ServiceDescription,
            Message = entity.Message,
            Status = entity.Status,
            CreatedAtUtc = entity.CreatedAtUtc,
            UpdatedAtUtc = entity.UpdatedAtUtc
        });
    }

    [HttpGet]
    [Authorize(Roles = "Admin,Owner,Sales,Sales Order")]
    public async Task<IActionResult> GetConsultations()
    {
        var consultations = await _context.ConsultationRequests
            .OrderByDescending(x => x.CreatedAtUtc)
            .Select(x => new ConsultationDto
            {
                Id = x.Id,
                Name = x.Name,
                Phone = x.Phone,
                Email = x.Email,
                ServiceDescription = x.ServiceDescription,
                Message = x.Message,
                Status = x.Status,
                CreatedAtUtc = x.CreatedAtUtc,
                UpdatedAtUtc = x.UpdatedAtUtc
            })
            .ToListAsync();

        return Ok(consultations);
    }

    [HttpPut("{id}/status")]
    [Authorize(Roles = "Admin,Owner,Sales,Sales Order")]
    public async Task<IActionResult> UpdateStatus(Guid id, [FromBody] UpdateConsultationStatusRequest request)
    {
        var consultation = await _context.ConsultationRequests.FindAsync(id);
        if (consultation == null) return NotFound();

        consultation.Status = request.Status;
        consultation.UpdatedAtUtc = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return NoContent();
    }
}
