using DeckVault.Api.Data;
using DeckVault.Api.DTOs;
using DeckVault.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DeckVault.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class DecksController(DeckVaultContext db) : ControllerBase
{
    // GET /api/decks
    // Returns a summary list of all decks (no card details — those come from GetById)
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var decks = await db.Decks
            // Project directly to DTO — no Include needed since we don't want cards here
            .Select(d => new DeckResponse
            {
                Id = d.Id,
                Name = d.Name,
                Format = d.Format,
                CreatedDate = d.CreatedDate
            })
            .ToListAsync();

        return Ok(decks);
    }

    // GET /api/decks/{id}
    // Returns a single deck with its full card list
    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var deck = await db.Decks
            // Include loads the DeckCards join table rows for this deck
            .Include(d => d.DeckCards)
                // ThenInclude follows the relationship further to load each DeckCard's Card
                // This is a two-level eager load: Deck → DeckCards → Card
                .ThenInclude(dc => dc.Card)
            .FirstOrDefaultAsync(d => d.Id == id);

        if (deck is null)
            return NotFound();

        // Map the loaded entity graph to a flat DTO structure
        var response = new DeckResponse
        {
            Id = deck.Id,
            Name = deck.Name,
            Format = deck.Format,
            CreatedDate = deck.CreatedDate,
            // Project each DeckCard join row into a DeckCardResponse DTO
            Cards = deck.DeckCards.Select(dc => new DeckCardResponse
            {
                CardId = dc.CardId,
                CardName = dc.Card.Name,
                ImageUrl = dc.Card.ImageUrl,
                Quantity = dc.Quantity
            }).ToList()
        };

        return Ok(response);
    }

    // POST /api/decks
    // Creates a new empty deck
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateDeckRequest request)
    {
        var deck = new Deck
        {
            Name = request.Name,
            Format = request.Format,
            // DateOnly.FromDateTime strips the time component — we only care about the date
            // UtcNow ensures the date is consistent regardless of the server's local timezone
            CreatedDate = DateOnly.FromDateTime(DateTime.UtcNow)
        };

        db.Decks.Add(deck);
        await db.SaveChangesAsync();

        // 201 Created — Location header will point to GET /api/decks/{id}
        // The third argument is the response body returned to the client
        return CreatedAtAction(nameof(GetById), new { id = deck.Id }, new DeckResponse
        {
            Id = deck.Id,
            Name = deck.Name,
            Format = deck.Format,
            CreatedDate = deck.CreatedDate
        });
    }

    // DELETE /api/decks/{id}
    // Deletes a deck and all its DeckCard rows (cascade delete handles the join table automatically)
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var deck = await db.Decks.FindAsync(id);
        if (deck is null) return NotFound();

        // EF Core's cascade delete convention removes the related DeckCard rows
        // automatically when the Deck is deleted — no manual cleanup needed
        db.Decks.Remove(deck);
        await db.SaveChangesAsync();
        return NoContent();
    }

    // DELETE /api/decks/{id}/cards/{cardId}
    // Removes a specific card from a deck without deleting the deck or the card itself
    [HttpDelete("{id}/cards/{cardId}")]
    public async Task<IActionResult> RemoveCard(int id, int cardId)
    {
        // Look up the join table row that links this deck to this card
        var deckCard = await db.DeckCards
            .FirstOrDefaultAsync(dc => dc.DeckId == id && dc.CardId == cardId);

        if (deckCard is null) return NotFound();

        db.DeckCards.Remove(deckCard);
        await db.SaveChangesAsync();
        return NoContent();
    }

    // POST /api/decks/{id}/cards
    // Adds a card to a deck, or updates the quantity if it's already there
    [HttpPost("{id}/cards")]
    public async Task<IActionResult> AddCard(int id, [FromBody] AddCardToDeckRequest request)
    {
        // Validate the deck exists — AnyAsync is more efficient than loading the full entity
        var deckExists = await db.Decks.AnyAsync(d => d.Id == id);
        if (!deckExists)
            return NotFound("Deck not found.");

        // Cards must already be in the collection before they can be added to a deck
        var cardExists = await db.Cards.AnyAsync(c => c.Id == request.CardId);
        if (!cardExists)
            return NotFound("Card not found in collection. Add it to your collection first.");

        // Check if this card is already in the deck (upsert pattern)
        var existing = await db.DeckCards
            .FirstOrDefaultAsync(dc => dc.DeckId == id && dc.CardId == request.CardId);

        if (existing is not null)
        {
            // Card already in deck — just update the quantity
            existing.Quantity = request.Quantity;
        }
        else
        {
            // Card not in deck yet — create the join table row
            db.DeckCards.Add(new DeckCard
            {
                DeckId = id,
                CardId = request.CardId,
                Quantity = request.Quantity
            });
        }

        await db.SaveChangesAsync();
        return NoContent();
    }
}
