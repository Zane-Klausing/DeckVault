using System.ComponentModel.DataAnnotations;

namespace DeckVault.Api.DTOs;

// Request DTO for POST /api/decks — the data needed to create a new deck
public class CreateDeckRequest
{
    [Required]
    [MaxLength(100)]  // mirrors the database column constraint in DeckVaultContext
    public string Name { get; set; } = string.Empty;

    [MaxLength(50)]
    public string? Format { get; set; }  // nullable — format is optional (e.g. "Standard", "Commander")
}

// Response DTO for a deck — used by both GET /api/decks and GET /api/decks/{id}.
// Cards is empty for the list endpoint and populated for the detail endpoint.
public class DeckResponse
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Format { get; set; }
    public DateOnly CreatedDate { get; set; }
    // Empty list by default — populated only when the full deck detail is fetched
    public List<DeckCardResponse> Cards { get; set; } = [];
}

// Represents one card entry within a deck detail response
public class DeckCardResponse
{
    public int CardId { get; set; }
    public string CardName { get; set; } = string.Empty;
    public string? ImageUrl { get; set; }
    public int Quantity { get; set; }  // how many copies of this card are in the deck
}

// Request DTO for POST /api/decks/{id}/cards — adds or updates a card in a deck
public class AddCardToDeckRequest
{
    // Must reference a card that already exists in the local database (i.e. in the collection)
    [Range(1, int.MaxValue, ErrorMessage = "CardId must be a valid card identifier.")]
    public int CardId { get; set; }

    [Range(1, int.MaxValue, ErrorMessage = "Quantity must be at least 1.")]
    public int Quantity { get; set; }
}
