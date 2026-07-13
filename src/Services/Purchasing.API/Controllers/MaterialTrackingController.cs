using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PJT_ERP.Purchasing.Api.Application.PurchaseRequests;

namespace PJT_ERP.Purchasing.Api.Controllers;

[ApiController]
[Authorize(Roles = "Admin,Finance,Engineering,Engineering Supervisor,Purchasing,Owner,Sales,Sales Order")]
[Route("api/v1/purchasing")]
public sealed class MaterialTrackingController(IPurchaseRequestService purchaseRequestService) : ControllerBase
{
    [HttpGet("material-requirements")]
    public async Task<ActionResult<IReadOnlyCollection<MaterialRequirementDto>>> ListMaterialRequirements(
        [FromQuery] Guid? salesOrderId,
        [FromQuery] string? status,
        CancellationToken cancellationToken)
    {
        return Ok(await purchaseRequestService.ListMaterialRequirementsAsync(salesOrderId, status, cancellationToken));
    }

    [HttpGet("sales-orders/{salesOrderId:guid}/material-tracking")]
    public async Task<ActionResult<SalesOrderMaterialTrackingDto>> GetSalesOrderMaterialTracking(
        Guid salesOrderId,
        CancellationToken cancellationToken)
    {
        var result = await purchaseRequestService.GetSalesOrderMaterialTrackingAsync(salesOrderId, cancellationToken);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpPut("material-requirements/{id:guid}/stock")]
    [Authorize(Roles = "Admin,Purchasing")]
    public async Task<ActionResult<MaterialRequirementDto>> UpdateMaterialRequirementStock(
        Guid id,
        UpdateMaterialStockInfoRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await purchaseRequestService.UpdateMaterialRequirementStockAsync(id, request, cancellationToken);
            return result is null ? NotFound() : Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}
