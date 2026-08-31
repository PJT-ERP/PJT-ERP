using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PJT_ERP.Production.Api.Application.Production;
using PJT_ERP.Shared.Infrastructure.Security;

namespace PJT_ERP.Production.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/production/sales-orders")]
public sealed class SalesOrdersController(
    ISalesOrderCommandService salesOrderCommandService,
    IProductionCommandService productionCommandService,
    IProductionQueryService queryService) : ControllerBase
{
    [HttpGet]
    [Authorize(Roles = "Admin,Owner,Sales,Sales Order,Finance,Engineering,Engineering Supervisor,Purchasing,QC")]
    public async Task<ActionResult<IReadOnlyCollection<SalesOrderDto>>> List(CancellationToken cancellationToken)
    {
        return Ok(await queryService.ListSalesOrdersAsync(cancellationToken));
    }

    [HttpGet("queues")]
    [Authorize(Roles = "Admin,Owner,Engineering Supervisor,Engineering,QC")]
    public async Task<ActionResult<ProductionQueuesDto>> GetQueues(CancellationToken cancellationToken)
    {
        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
        Guid? userId = Guid.TryParse(userIdString, out var parsed) ? parsed : null;
        
        var userRole = User.FindFirstValue(ClaimTypes.Role) ?? "";
        
        var queues = await queryService.GetProductionQueuesAsync(userId, userRole, cancellationToken);
        return Ok(queues);
    }

    [HttpGet("queues/engineering")]
    [Authorize(Roles = "Admin,Owner,Engineering Supervisor,Engineering")]
    public async Task<ActionResult<EngineeringQueuesDto>> GetEngineeringQueues(CancellationToken cancellationToken)
    {
        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
        Guid? userId = Guid.TryParse(userIdString, out var parsed) ? parsed : null;
        var userRole = User.FindFirstValue(ClaimTypes.Role) ?? "";
        
        return Ok(await queryService.GetEngineeringQueuesAsync(userId, userRole, cancellationToken));
    }

    [HttpGet("queues/finance-costing")]
    [Authorize(Roles = "Admin,Owner,Finance")]
    public async Task<ActionResult<FinanceCostingQueuesDto>> GetFinanceCostingQueues(CancellationToken cancellationToken)
    {
        return Ok(await queryService.GetFinanceCostingQueuesAsync(cancellationToken));
    }

    [HttpGet("queues/approvals")]
    [Authorize(Roles = "Admin,Owner,Sales")]
    public async Task<ActionResult<ApprovalQueuesDto>> GetApprovalQueues(CancellationToken cancellationToken)
    {
        return Ok(await queryService.GetApprovalQueuesAsync(cancellationToken));
    }

    [HttpGet("queues/qc")]
    [Authorize(Roles = "Admin,Owner,QC,Engineering Supervisor")]
    public async Task<ActionResult<QcQueuesDto>> GetQcQueues(CancellationToken cancellationToken)
    {
        return Ok(await queryService.GetQcQueuesAsync(cancellationToken));
    }

    [HttpGet("queues/board")]
    [Authorize(Roles = "Admin,Owner,Engineering Supervisor,Engineering,Production")]
    public async Task<ActionResult<ProductionBoardQueuesDto>> GetProductionBoardQueues(CancellationToken cancellationToken)
    {
        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
        Guid? userId = Guid.TryParse(userIdString, out var parsed) ? parsed : null;
        var userRole = User.FindFirstValue(ClaimTypes.Role) ?? "";
        
        return Ok(await queryService.GetProductionBoardQueuesAsync(userId, userRole, cancellationToken));
    }

    [HttpGet("{id:guid}/progress")]
    [Authorize(Roles = "Admin,Owner,Sales,Sales Order,Finance,Engineering,Engineering Supervisor,Purchasing,QC")]
    public async Task<ActionResult<SalesOrderProductionProgressDto>> GetProgress(Guid id, CancellationToken cancellationToken)
    {
        var progress = await queryService.GetSalesOrderProgressAsync(id, cancellationToken);
        return progress is null ? NotFound() : Ok(progress);
    }

    [HttpPost]
    [Authorize(Roles = "Admin,Sales,Sales Order")]
    public async Task<ActionResult<SalesOrderDto>> Create(CreateSalesOrderRequest request, CancellationToken cancellationToken)
    {
        try
        {
            var order = await salesOrderCommandService.CreateSalesOrderAsync(request, cancellationToken);
            return CreatedAtAction(nameof(List), new { id = order.Id }, order);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[DEBUG] Create SalesOrder Exception: {ex.Message}");
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("complete")]
    [Authorize(Roles = "Admin,Sales,Sales Order")]
    public async Task<ActionResult<SalesOrderDto>> CreateComplete(CompleteSalesOrderRequest request, CancellationToken cancellationToken)
    {
        try
        {
            var order = await salesOrderCommandService.CreateCompleteSalesOrderAsync(request, cancellationToken);
            return CreatedAtAction(nameof(List), new { id = order.Id }, order);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[DEBUG] CreateComplete SalesOrder Exception: {ex.Message}");
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = "Admin,Sales,Engineering Supervisor,Engineering,Owner,Sales Order")]
    public async Task<ActionResult<SalesOrderDto>> UpdateGeneral(
        Guid id, 
        UpdateSalesOrderGeneralRequest request, 
        CancellationToken cancellationToken)
    {
        try
        {
            var order = await salesOrderCommandService.UpdateSalesOrderGeneralAsync(id, request, cancellationToken);
            return order is null ? NotFound() : Ok(order);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("{id:guid}/engineers")]
    [Authorize(Roles = "Admin,Engineering Supervisor,Owner,Engineering")]
    public async Task<ActionResult<SalesOrderDto>> AssignEngineers(Guid id, AssignSalesOrderEngineersRequest request, CancellationToken cancellationToken)
    {
        try
        {
            var order = await salesOrderCommandService.AssignSalesOrderEngineersAsync(id, request, cancellationToken);
            return order is null ? NotFound() : Ok(order);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("{id:guid}/design-status")]
    [Authorize(Roles = "Admin,Engineering Supervisor,Engineering")]
    public async Task<ActionResult<SalesOrderDto>> UpdateDesignStatus(
        Guid id,
        UpdateSalesOrderDesignStatusRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var order = await salesOrderCommandService.UpdateSalesOrderDesignStatusAsync(id, request, cancellationToken);
            return order is null ? NotFound() : Ok(order);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("{id:guid}/customer-drawing")]
    [Authorize(Roles = "Admin,Sales,Engineering Supervisor,Engineering")]
    public async Task<ActionResult<SalesOrderDto>> UpdateCustomerDrawing(
        Guid id,
        UpdateCustomerDrawingUrlRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var order = await salesOrderCommandService.UpdateCustomerDrawingUrlAsync(id, request, cancellationToken);
            return order is null ? NotFound() : Ok(order);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("{id:guid}/items")]
    [Authorize(Roles = "Admin,Engineering Supervisor,Engineering")]
    public async Task<ActionResult<SalesOrderDto>> UpdateItems(
        Guid id,
        UpdateSalesOrderItemsRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var order = await salesOrderCommandService.UpdateSalesOrderItemsAsync(id, request, cancellationToken);
            return order is null ? NotFound() : Ok(order);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("{id:guid}/pricing")]
    [Authorize(Roles = "Admin,Finance,Owner")]
    public async Task<ActionResult<SalesOrderDto>> SetPricing(
        Guid id,
        SetSalesOrderPricingRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var order = await salesOrderCommandService.SetSalesOrderPricingAsync(id, request, cancellationToken);
            return order is null ? NotFound() : Ok(order);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("{id:guid}/submit-design")]
    [Authorize(Roles = "Admin,Engineering Supervisor,Engineering")]
    public async Task<ActionResult<SalesOrderDto>> SubmitDesign(
        Guid id,
        SubmitSalesOrderDesignRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var order = await salesOrderCommandService.SubmitSalesOrderDesignAsync(id, request, cancellationToken);
            return order is null ? NotFound() : Ok(order);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("{id:guid}/confirm")]
    [Authorize(Roles = "Admin,Sales,Sales Order,Engineering Supervisor,Engineering")]
    public async Task<ActionResult<SalesOrderProductionProgressDto>> Confirm(Guid id, ConfirmSalesOrderRequest request, CancellationToken cancellationToken)
    {
        try
        {
            return Ok(await salesOrderCommandService.ConfirmSalesOrderAsync(id, request, cancellationToken));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("{id:guid}/engineering-drawing")]
    [Authorize(Roles = "Admin,Engineering,Engineering Supervisor,Owner,Production")]
    public async Task<ActionResult<SalesOrderProductionProgressDto>> UploadEngineeringDrawing(
        Guid id,
        UploadEngineeringDrawingRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var isPrivileged = User.IsInRole("Admin") || User.IsInRole("Owner") || User.IsInRole("Engineering Supervisor");
            var result = await productionCommandService.UploadEngineeringDrawingAsync(id, request, cancellationToken, isPrivileged);
            return result is null ? NotFound() : Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("upload-drawing-file")]
    [Authorize(Roles = "Admin,Engineering,Engineering Supervisor,Owner,Production")]
    public async Task<ActionResult<object>> UploadDrawingFile(
        [FromForm] IFormFile file,
        [FromServices] IWebHostEnvironment env,
        CancellationToken cancellationToken)
    {
        if (file is null || file.Length == 0)
        {
            return BadRequest(new { message = "No file uploaded." });
        }

        try
        {
            await FileUploadSecurityValidator.ValidateFileAsync(file, cancellationToken);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }

        var uploadsFolder = Path.Combine(
            env.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot"),
            "engineering-drawings");

        Directory.CreateDirectory(uploadsFolder);

        var uniqueFileName = FileUploadSecurityValidator.SanitizeFileName(file.FileName);
        var filePath = Path.Combine(uploadsFolder, uniqueFileName);

        var fullPath = Path.GetFullPath(filePath);
        var baseDir = Path.GetFullPath(uploadsFolder);
        if (!fullPath.StartsWith(baseDir + Path.DirectorySeparatorChar, StringComparison.Ordinal) && !fullPath.Equals(baseDir, StringComparison.Ordinal))
        {
            return BadRequest(new { message = "Invalid upload path." });
        }

        using (var stream = new FileStream(filePath, FileMode.Create))
        {
            await file.CopyToAsync(stream, cancellationToken);
        }

        return Ok(new { url = $"/engineering-drawings/{uniqueFileName}" });
    }

    [HttpGet("engineering-drawings/{fileName}")]
    [Authorize(Roles = "Admin,Engineering,Engineering Supervisor,Owner,Production,Sales,Sales Order")]
    public IActionResult GetEngineeringDrawing(string fileName, [FromServices] IWebHostEnvironment env)
    {
        if (string.IsNullOrWhiteSpace(fileName))
        {
            return BadRequest(new { message = "File name is required." });
        }

        var safeFileName = Path.GetFileName(fileName);
        var uploadsFolder = Path.Combine(
            env.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot"),
            "engineering-drawings");

        var filePath = Path.Combine(uploadsFolder, safeFileName);
        var fullPath = Path.GetFullPath(filePath);
        var baseDir = Path.GetFullPath(uploadsFolder);

        if (!fullPath.StartsWith(baseDir + Path.DirectorySeparatorChar, StringComparison.Ordinal) && !fullPath.Equals(baseDir, StringComparison.Ordinal))
        {
            return BadRequest(new { message = "Invalid path traversal attempt." });
        }

        if (!System.IO.File.Exists(fullPath))
        {
            return NotFound(new { message = "Engineering drawing file not found." });
        }

        var ext = Path.GetExtension(safeFileName).ToLowerInvariant();
        var contentType = ext switch
        {
            ".pdf" => "application/pdf",
            ".png" => "image/png",
            ".jpg" or ".jpeg" => "image/jpeg",
            ".webp" => "image/webp",
            _ => "application/octet-stream"
        };

        Response.Headers.Append("X-Content-Type-Options", "nosniff");
        Response.Headers.Append("Content-Security-Policy", "default-src 'none'; sandbox");
        Response.Headers.Append("Cache-Control", "private, no-cache, no-store, must-revalidate");

        return PhysicalFile(fullPath, contentType);
    }

    [HttpPost("{id:guid}/material-requests")]
    [Authorize(Roles = "Admin,Engineering,Engineering Supervisor,Owner,Production")]
    public async Task<ActionResult<SalesOrderProductionProgressDto>> SubmitMaterialRequest(
        Guid id,
        SubmitProductionMaterialRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var isPrivileged = User.IsInRole("Admin") || User.IsInRole("Owner") || User.IsInRole("Engineering Supervisor");
            var result = await productionCommandService.SubmitMaterialRequestAsync(id, request, cancellationToken, isPrivileged);
            return result is null ? NotFound() : Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("{id:guid}/production/start")]
    [Authorize(Roles = "Admin,Engineering,Engineering Supervisor,Owner,Production")]
    public async Task<ActionResult<SalesOrderProductionProgressDto>> StartProduction(
        Guid id,
        ProductionStatusUpdateRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var isPrivileged = User.IsInRole("Admin") || User.IsInRole("Owner") || User.IsInRole("Engineering Supervisor");
            var result = await productionCommandService.StartProductionAsync(id, request, cancellationToken, isPrivileged);
            return result is null ? NotFound() : Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("{id:guid}/production/finish")]
    [Authorize(Roles = "Admin,Engineering,Engineering Supervisor,Owner,Production")]
    public async Task<ActionResult<SalesOrderProductionProgressDto>> FinishProduction(
        Guid id,
        ProductionStatusUpdateRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var isPrivileged = User.IsInRole("Admin") || User.IsInRole("Owner") || User.IsInRole("Engineering Supervisor");
            var result = await productionCommandService.FinishProductionAsync(id, request, cancellationToken, isPrivileged);
            return result is null ? NotFound() : Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("{id:guid}/production/pause")]
    [Authorize(Roles = "Admin,Engineering,Engineering Supervisor,Owner,Production")]
    public async Task<ActionResult<SalesOrderProductionProgressDto>> PauseProduction(
        Guid id,
        ProductionStatusUpdateRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var isPrivileged = User.IsInRole("Admin") || User.IsInRole("Owner") || User.IsInRole("Engineering Supervisor");
            var result = await productionCommandService.PauseProductionAsync(id, request, cancellationToken, isPrivileged);
            return result is null ? NotFound() : Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("{id:guid}/production/resume")]
    [Authorize(Roles = "Admin,Engineering,Engineering Supervisor,Owner,Production")]
    public async Task<ActionResult<SalesOrderProductionProgressDto>> ResumeProduction(
        Guid id,
        ProductionStatusUpdateRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var isPrivileged = User.IsInRole("Admin") || User.IsInRole("Owner") || User.IsInRole("Engineering Supervisor");
            var result = await productionCommandService.ResumeProductionAsync(id, request, cancellationToken, isPrivileged);
            return result is null ? NotFound() : Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "Admin,Sales,Sales Order,Owner")]
    public async Task<ActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        try
        {
            var success = await salesOrderCommandService.DeleteSalesOrderAsync(id, cancellationToken);
            return success ? NoContent() : NotFound();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("{id:guid}/comments")]
    [Authorize(Roles = "Admin,Owner,Sales,Sales Order,Finance,Engineering,Engineering Supervisor,Purchasing,QC")]
    public async Task<ActionResult<SalesOrderCommentDto>> AddComment(Guid id, AddSalesOrderCommentRequest request, CancellationToken cancellationToken)
    {
        var comment = await salesOrderCommandService.AddCommentAsync(id, request, cancellationToken);
        return comment is null ? NotFound() : Ok(comment);
    }

    [HttpPut("{id:guid}/comments/{commentId:guid}")]
    [Authorize(Roles = "Admin,Owner,Sales,Sales Order,Finance,Engineering,Engineering Supervisor,Purchasing,QC")]
    public async Task<ActionResult> UpdateComment(Guid id, Guid commentId, UpdateSalesOrderCommentRequest request, CancellationToken cancellationToken)
    {
        var success = await salesOrderCommandService.UpdateCommentAsync(id, commentId, request, cancellationToken);
        return success ? NoContent() : NotFound();
    }

    [HttpDelete("{id:guid}/comments/{commentId:guid}")]
    [Authorize(Roles = "Admin,Owner,Sales,Sales Order,Finance,Engineering,Engineering Supervisor,Purchasing,QC")]
    public async Task<ActionResult> DeleteComment(Guid id, Guid commentId, CancellationToken cancellationToken)
    {
        var success = await salesOrderCommandService.DeleteCommentAsync(id, commentId, cancellationToken);
        return success ? NoContent() : NotFound();
    }
}
