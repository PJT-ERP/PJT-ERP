using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PJT_ERP.Identity.Api.Application.Reports;
using PJT_ERP.Shared.Auth;

namespace PJT_ERP.Identity.Api.Controllers;

[ApiController]
[Route("api/v1/reports")]
[Authorize]
public sealed class DailyReportsController(IDailyReportService reportService) : ControllerBase
{
    [HttpPost]
    public async Task<ActionResult<DailyReportDto>> CreateReport([FromForm] CreateReportRequest request, CancellationToken cancellationToken)
    {
        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdString, out var userId)) return Unauthorized();

        var report = await reportService.CreateReportAsync(userId, request, cancellationToken);
        return Ok(report);
    }

    [HttpGet("me")]
    public async Task<ActionResult<IReadOnlyCollection<DailyReportDto>>> GetMyReports(CancellationToken cancellationToken)
    {
        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdString, out var userId)) return Unauthorized();

        var reports = await reportService.GetMyReportsAsync(userId, cancellationToken);
        return Ok(reports);
    }

    [HttpGet("all")]
    [Authorize(Roles = "Owner,Admin")]
    public async Task<ActionResult<IReadOnlyCollection<DailyReportDto>>> GetAllReports(CancellationToken cancellationToken)
    {
        var reports = await reportService.GetAllReportsAsync(cancellationToken);
        return Ok(reports);
    }
}
