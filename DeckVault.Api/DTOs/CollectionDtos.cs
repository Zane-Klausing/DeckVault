using System.ComponentModel.DataAnnotations;

namespace DeckVault.Api.DTOs;

// Request DTO for POST /api/collection.
// The frontend sends this when adding a card to the collection.
// Data annotations are validated automatically by [ApiController] — a missing
// [Required] field returns 400 Bad Request before the action method even runs.
public class AddToCollectionRequest
{
    [Required]
    public string ScryfallId { get; set; } = string.Empty;  // used to look up or create the Card

    [Required]
    public string Name { get; set; } = string.Empty;

    [Required]
    public string SetCode { get; set; } = string.Empty;

    public string? ImageUrl { get; set; }  // optional — card images may not always be available

    // Range ensures the client can't send 0 or negative quantities
    [Range(1, int.MaxValue, ErrorMessage = "Quantity must be at least 1.")]
    public int Quantity { get; set; }

    // 0 is allowed — a card could be free or gifted
    [Range(0, double.MaxValue, ErrorMessage = "Purchase price cannot be negative.")]
    public decimal PurchasePrice { get; set; }

    [Required]
    public DateOnly PurchaseDate { get; set; }
}

// Response DTO for collection entries — returned by GET /api/collection and POST /api/collection.
// Flattens the CollectionEntry + Card join into a single object for the frontend.
public class CollectionEntryResponse
{
    public int Id { get; set; }          // CollectionEntry primary key (used for DELETE)
    public int CardId { get; set; }
    public string CardName { get; set; } = string.Empty;
    public string SetCode { get; set; } = string.Empty;
    public string? ImageUrl { get; set; }
    public int Quantity { get; set; }
    public decimal PurchasePrice { get; set; }
    public DateOnly PurchaseDate { get; set; }
}
