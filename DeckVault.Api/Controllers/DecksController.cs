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
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var decks = await db.Decks
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

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var deck = await db.Decks
            .Include(d => d.DeckCards)
                .ThenInclude(dc => dc.Card)
            .FirstOrDefaultAsync(d => d.Id == id);

        if (deck is null)
            return NotFound();

        var response = new DeckResponse
        {
            Id = deck.Id,
            Name = deck.Name,
            Format = deck.Format,
            CreatedDate = deck.CreatedDate,
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

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateDeckRequest request)
    {
        var deck = new Deck
        {
            Name = request.Name,
            Format = request.Format,
            CreatedDate = DateOnly.FromDateTime(DateTime.UtcNow)
        };

        db.Decks.Add(deck);
        await db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = deck.Id }, new DeckResponse
        {
            Id = deck.Id,
            Name = deck.Name,
            Format = deck.Format,
            CreatedDate = deck.CreatedDate
        });
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var deck = await db.Decks.FindAsync(id);
        if (deck is null) return NotFound();

        db.Decks.Remove(deck);
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id}/cards/{cardId}")]
    public async Task<IActionResult> RemoveCard(int id, int cardId)
    {
        var deckCard = await db.DeckCards
            .FirstOrDefaultAsync(dc => dc.DeckId == id && dc.CardId == cardId);

        if (deckCard is null) return NotFound();

        db.DeckCards.Remove(deckCard);
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPost("{id}/cards")]
    public async Task<IActionResult> AddCard(int id, [FromBody] AddCardToDeckRequest request)
    {
        var deckExists = await db.Decks.AnyAsync(d => d.Id == id);
        if (!deckExists)
            return NotFound("Deck not found.");

        var cardExists = await db.Cards.AnyAsync(c => c.Id == request.CardId);
        if (!cardExists)
            return NotFound("Card not found in collection. Add it to your collection first.");

        var existing = await db.DeckCards
            .FirstOrDefaultAsync(dc => dc.DeckId == id && dc.CardId == request.CardId);

        if (existing is not null)
        {
            existing.Quantity = request.Quantity;
        }
        else
        {
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
