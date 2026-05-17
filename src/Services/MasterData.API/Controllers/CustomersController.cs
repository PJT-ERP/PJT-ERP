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

    [HttpPost]
    [Authorize(Roles = "Admin,Sales Order")]
    public async Task<ActionResult<CustomerDto>> Create(CreateCustomerRequest request, CancellationToken cancellationToken)
    {
        var customer = await catalogService.CreateCustomerAsync(request, cancellationToken);
        return CreatedAtAction(nameof(List), new { id = customer.Id }, customer);
    }
}
