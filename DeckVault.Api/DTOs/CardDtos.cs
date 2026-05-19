namespace DeckVault.Api.DTOs;

// Response DTO for a card stored in the local database.
// Returned by GET /api/cards — exposes only the fields the frontend needs,
// not the full Card entity (which could expose internal or EF navigation properties).
public class CardResponse
{
    public int Id { get; set; }           // local database primary key
    public string ScryfallId { get; set; } = string.Empty;  // Scryfall's unique card identifier
    public string Name { get; set; } = string.Empty;
    public string SetCode { get; set; } = string.Empty;      // e.g. "LTR", "MOM"
    public string? ImageUrl { get; set; }                    // nullable — not all cards have images
}
