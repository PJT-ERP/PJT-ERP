using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PJT_ERP.MasterData.Api.Application.Models;
using System.Text.Json;

namespace PJT_ERP.MasterData.Api.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
public class ContentController : ControllerBase
{
    private readonly IWebHostEnvironment _env;
    private readonly ILogger<ContentController> _logger;
    private readonly string _contentFilePath;

    public ContentController(IWebHostEnvironment env, ILogger<ContentController> logger)
    {
        _env = env;
        _logger = logger;
        
        // Save the content inside the service's Data directory (create if doesn't exist)
        var dataDir = Path.Combine(_env.ContentRootPath, "Data");
        if (!Directory.Exists(dataDir))
        {
            Directory.CreateDirectory(dataDir);
        }
        
        _contentFilePath = Path.Combine(dataDir, "landing-page-content.json");
    }

    [HttpGet("landing-page")]
    [AllowAnonymous]
    public async Task<ActionResult<LandingPageContentDto>> GetLandingPageContent()
    {
        try
        {
            if (!System.IO.File.Exists(_contentFilePath))
            {
                // Return default empty DTO, or we could return 404. Let's return a default.
                return Ok(new LandingPageContentDto());
            }

            var json = await System.IO.File.ReadAllTextAsync(_contentFilePath);
            var content = JsonSerializer.Deserialize<LandingPageContentDto>(json, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
            
            return Ok(content ?? new LandingPageContentDto());
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error reading landing page content");
            return StatusCode(500, "An error occurred while reading the content.");
        }
    }

    [HttpPut("landing-page")]
    [Authorize(Roles = "Admin,Owner")]
    public async Task<IActionResult> UpdateLandingPageContent([FromBody] LandingPageContentDto content)
    {
        if (content == null)
            return BadRequest("Content cannot be null");

        try
        {
            var options = new JsonSerializerOptions { WriteIndented = true };
            var json = JsonSerializer.Serialize(content, options);
            
            await System.IO.File.WriteAllTextAsync(_contentFilePath, json);
            
            return Ok(new { success = true });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error saving landing page content");
            return StatusCode(500, "An error occurred while saving the content.");
        }
    }
}
