using System.ComponentModel.DataAnnotations;

namespace DeckVault.Api.DTOs;

public class AddToCollectionRequest
{
    [Required]
    public string ScryfallId { get; set; } = string.Empty;

    [Required]
    public string Name { get; set; } = string.Empty;

    [Required]
    public string SetCode { get; set; } = string.Empty;

    public string? ImageUrl { get; set; }

    [Range(1, int.MaxValue, ErrorMessage = "Quantity must be at least 1.")]
    public int Quantity { get; set; }

    [Range(0, double.MaxValue, ErrorMessage = "Purchase price cannot be negative.")]
    public decimal PurchasePrice { get; set; }

    [Required]
    public DateOnly PurchaseDate { get; set; }
}

public class CollectionEntryResponse
{
    public int Id { get; set; }
    public int CardId { get; set; }
    public string CardName { get; set; } = string.Empty;
    public string SetCode { get; set; } = string.Empty;
    public string? ImageUrl { get; set; }
    public int Quantity { get; set; }
    public decimal PurchasePrice { get; set; }
    public DateOnly PurchaseDate { get; set; }
}
