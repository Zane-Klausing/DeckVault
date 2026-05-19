using DeckVault.Api.Data;
using DeckVault.Api.DTOs;
using DeckVault.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DeckVault.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
// DeckVaultContext is injected by ASP.NET's DI container via the primary constructor
public class CollectionController(DeckVaultContext db) : ControllerBase
{
    // GET /api/collection
    // Returns every entry in the user's collection with card details joined in
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var entries = await db.CollectionEntries
            // Include performs an SQL JOIN to load the related Card for each entry.
            // Without this, e.Card would be null (EF does not load related data by default).
            .Include(e => e.Card)
            // Project to a DTO — flattens the joined data into a single response object
            .Select(e => new CollectionEntryResponse
            {
                Id = e.Id,
                CardId = e.CardId,
                CardName = e.Card.Name,   // pulled from the joined Card row
                SetCode = e.Card.SetCode,
                ImageUrl = e.Card.ImageUrl,
                Quantity = e.Quantity,
                PurchasePrice = e.PurchasePrice,
                PurchaseDate = e.PurchaseDate
            })
            .ToListAsync();

        return Ok(entries);
    }

    // POST /api/collection
    // Adds a card to the collection. If the card doesn't exist in the local DB yet, it creates it first.
    [HttpPost]
    public async Task<IActionResult> Add([FromBody] AddToCollectionRequest request)
    {
        // Check whether this Scryfall card is already stored locally.
        // ScryfallId is the stable unique identifier from Scryfall's API.
        var card = await db.Cards.FirstOrDefaultAsync(c => c.ScryfallId == request.ScryfallId);

        if (card is null)
        {
            // Card not in local DB yet — create it from the data the frontend sent
            card = new Card
            {
                ScryfallId = request.ScryfallId,
                Name = request.Name,
                SetCode = request.SetCode,
                ImageUrl = request.ImageUrl
            };
            // Stage the new card for insertion — not saved to DB yet
            db.Cards.Add(card);
        }

        // Create the collection entry linked to the card.
        // Setting Card = card (navigation property) instead of CardId = card.Id lets EF
        // resolve the foreign key graph in a single SaveChangesAsync call,
        // even if the card was just created above and doesn't have a DB-assigned Id yet.
        var entry = new CollectionEntry
        {
            Card = card,
            Quantity = request.Quantity,
            PurchasePrice = request.PurchasePrice,
            PurchaseDate = request.PurchaseDate
        };

        db.CollectionEntries.Add(entry);

        // Single save handles both the new card (if any) and the new entry in one transaction
        await db.SaveChangesAsync();

        // 201 Created — includes a Location header pointing to the collection endpoint
        // and returns the saved entry as the response body
        return CreatedAtAction(nameof(GetAll), new CollectionEntryResponse
        {
            Id = entry.Id,
            CardId = card.Id,
            CardName = card.Name,
            SetCode = card.SetCode,
            ImageUrl = card.ImageUrl,
            Quantity = entry.Quantity,
            PurchasePrice = entry.PurchasePrice,
            PurchaseDate = entry.PurchaseDate
        });
    }

    // DELETE /api/collection/{id}
    // Removes a single collection entry by its ID
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        // FindAsync looks up the entity by primary key — efficient, uses the identity cache
        var entry = await db.CollectionEntries.FindAsync(id);

        if (entry is null)
            return NotFound();

        db.CollectionEntries.Remove(entry);
        await db.SaveChangesAsync();

        // 204 No Content — success, but nothing to return
        return NoContent();
    }
}
