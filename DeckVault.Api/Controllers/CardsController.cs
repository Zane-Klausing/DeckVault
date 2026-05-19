using DeckVault.Api.Data;
using DeckVault.Api.DTOs;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace DeckVault.Api.Controllers;

// [ApiController] enables automatic model validation (returns 400 if required fields are missing)
// and other API-specific behaviour like binding JSON request bodies automatically.
// [Route("api/[controller]")] maps this controller to /api/cards — [controller] is replaced
// with the class name minus "Controller".
[ApiController]
[Route("api/[controller]")]
// Primary constructor syntax — ASP.NET's DI container injects DeckVaultContext and
// IHttpClientFactory automatically. No need to write a constructor body.
public class CardsController(DeckVaultContext db, IHttpClientFactory httpClientFactory) : ControllerBase
{
    // Static readonly means one instance is created for the lifetime of the application
    // and shared across all requests — safe here because JsonSerializerOptions is immutable after init.
    // SnakeCaseLower tells the deserializer to map JSON keys like "image_uris" to C# properties.
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower
    };

    // GET /api/cards/search?q=lightning+bolt
    // [FromQuery] binds the "q" URL parameter to the method argument
    [HttpGet("search")]
    public async Task<IActionResult> Search([FromQuery] string q)
    {
        // Guard against empty searches before hitting the external API
        if (string.IsNullOrWhiteSpace(q))
            return BadRequest("Query parameter 'q' is required.");

        // Retrieve the pre-configured Scryfall client — base URL and headers are already set
        var client = httpClientFactory.CreateClient("Scryfall");

        // EscapeDataString percent-encodes special characters in the query
        // so they are safe to include in a URL (e.g. spaces become %20)
        var response = await client.GetAsync($"cards/search?q={Uri.EscapeDataString(q)}");

        // Scryfall returns 404 when no cards match — that's not an error for us,
        // just return an empty array so the frontend handles it gracefully
        if (response.StatusCode == System.Net.HttpStatusCode.NotFound)
            return Ok(Array.Empty<ScryfallCardDto>());

        // Any other non-success response (rate limit, server error, etc.) is a bad gateway —
        // the external dependency failed, not the client's request
        if (!response.IsSuccessStatusCode)
            return StatusCode(502, "Scryfall search failed.");

        // Read the raw JSON string from the response body
        var json = await response.Content.ReadAsStringAsync();

        // Deserialize the JSON into our DTO using the snake_case naming policy
        // The ?. null-conditional handles the unlikely case that Deserialize returns null
        var result = JsonSerializer.Deserialize<ScryfallSearchResultDto>(json, JsonOptions);

        // result?.Data is the list of card objects; ?? [] returns an empty list if null
        return Ok(result?.Data ?? []);
    }

    // GET /api/cards
    // Returns all cards stored in the local database (cards the user has interacted with)
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        // Select projects each Card entity to a CardResponse DTO,
        // only sending the fields the frontend needs rather than the full entity
        var cards = await db.Cards
            .Select(c => new CardResponse
            {
                Id = c.Id,
                ScryfallId = c.ScryfallId,
                Name = c.Name,
                SetCode = c.SetCode,
                ImageUrl = c.ImageUrl
            })
            .ToListAsync(); // Executes the SQL query asynchronously

        return Ok(cards);
    }
}
