using DeckVault.Api.Data;
using DeckVault.Api.DTOs;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace DeckVault.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class CardsController(DeckVaultContext db, IHttpClientFactory httpClientFactory) : ControllerBase
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower
    };

    [HttpGet("search")]
    public async Task<IActionResult> Search([FromQuery] string q)
    {
        if (string.IsNullOrWhiteSpace(q))
            return BadRequest("Query parameter 'q' is required.");

        var client = httpClientFactory.CreateClient("Scryfall");
        var response = await client.GetAsync($"cards/search?q={Uri.EscapeDataString(q)}");

        if (response.StatusCode == System.Net.HttpStatusCode.NotFound)
            return Ok(Array.Empty<ScryfallCardDto>());

        if (!response.IsSuccessStatusCode)
            return StatusCode(502, "Scryfall search failed.");

        var json = await response.Content.ReadAsStringAsync();
        var result = JsonSerializer.Deserialize<ScryfallSearchResultDto>(json, JsonOptions);

        return Ok(result?.Data ?? []);
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var cards = await db.Cards
            .Select(c => new CardResponse
            {
                Id = c.Id,
                ScryfallId = c.ScryfallId,
                Name = c.Name,
                SetCode = c.SetCode,
                ImageUrl = c.ImageUrl
            })
            .ToListAsync();

        return Ok(cards);
    }
}
