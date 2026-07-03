using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PJT_ERP.MasterData.Api.Application.Catalog;

namespace PJT_ERP.MasterData.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/master-data/customers")]
public sealed class CustomersController(ICatalogService catalogService) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyCollection<CustomerDto>>> List(CancellationToken cancellationToken)
    {
        return Ok(await catalogService.ListCustomersAsync(cancellationToken));
    }

    [HttpGet("next-code")]
    public async Task<ActionResult<object>> GetNextCode(CancellationToken cancellationToken)
    {
        var code = await catalogService.PreviewNextCustomerCodeAsync(cancellationToken);
        return Ok(new { code });
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<CustomerDto>> GetById(Guid id, CancellationToken cancellationToken)
    {
        var customer = await catalogService.GetCustomerAsync(id, cancellationToken);
        if (customer is null) return NotFound();
        return Ok(customer);
    }

    [HttpPost]
    [Authorize(Roles = "Admin,Owner,Sales,Sales Order")]
    public async Task<ActionResult<CustomerDto>> Create(CreateCustomerRequest request, CancellationToken cancellationToken)
    {
        var customer = await catalogService.CreateCustomerAsync(request, cancellationToken);
        return CreatedAtAction(nameof(List), new { id = customer.Id }, customer);
    }

    [HttpPut("{code}")]
    [Authorize(Roles = "Admin,Owner,Sales,Sales Order")]
    public async Task<ActionResult<CustomerDto>> Update(string code, UpdateCustomerRequest request, CancellationToken cancellationToken)
    {
        var customer = await catalogService.UpdateCustomerAsync(code, request, cancellationToken);
        if (customer is null) return NotFound();
        return Ok(customer);
    }

    [HttpDelete("{code}")]
    [Authorize(Roles = "Admin,Owner,Sales,Sales Order")]
    public async Task<ActionResult> Delete(string code, CancellationToken cancellationToken)
    {
        var success = await catalogService.DeleteCustomerAsync(code, cancellationToken);
        if (!success) return NotFound();
        return NoContent();
    }
}
