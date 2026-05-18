using DeckVault.Api.Data;
using DeckVault.Api.DTOs;
using DeckVault.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DeckVault.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class CollectionController(DeckVaultContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var entries = await db.CollectionEntries
            .Include(e => e.Card)
            .Select(e => new CollectionEntryResponse
            {
                Id = e.Id,
                CardId = e.CardId,
                CardName = e.Card.Name,
                SetCode = e.Card.SetCode,
                ImageUrl = e.Card.ImageUrl,
                Quantity = e.Quantity,
                PurchasePrice = e.PurchasePrice,
                PurchaseDate = e.PurchaseDate
            })
            .ToListAsync();

        return Ok(entries);
    }

    [HttpPost]
    public async Task<IActionResult> Add([FromBody] AddToCollectionRequest request)
    {
        var card = await db.Cards.FirstOrDefaultAsync(c => c.ScryfallId == request.ScryfallId);

        if (card is null)
        {
            card = new Card
            {
                ScryfallId = request.ScryfallId,
                Name = request.Name,
                SetCode = request.SetCode,
                ImageUrl = request.ImageUrl
            };
            db.Cards.Add(card);
        }

        var entry = new CollectionEntry
        {
            Card = card,
            Quantity = request.Quantity,
            PurchasePrice = request.PurchasePrice,
            PurchaseDate = request.PurchaseDate
        };

        db.CollectionEntries.Add(entry);
        await db.SaveChangesAsync();

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

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var entry = await db.CollectionEntries.FindAsync(id);

        if (entry is null)
            return NotFound();

        db.CollectionEntries.Remove(entry);
        await db.SaveChangesAsync();

        return NoContent();
    }
}
