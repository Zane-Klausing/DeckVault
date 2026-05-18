using System.ComponentModel.DataAnnotations;

namespace DeckVault.Api.DTOs;

public class CreateDeckRequest
{
    [Required]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(50)]
    public string? Format { get; set; }
}

public class DeckResponse
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Format { get; set; }
    public DateOnly CreatedDate { get; set; }
    public List<DeckCardResponse> Cards { get; set; } = [];
}

public class DeckCardResponse
{
    public int CardId { get; set; }
    public string CardName { get; set; } = string.Empty;
    public string? ImageUrl { get; set; }
    public int Quantity { get; set; }
}

public class AddCardToDeckRequest
{
    [Range(1, int.MaxValue, ErrorMessage = "CardId must be a valid card identifier.")]
    public int CardId { get; set; }

    [Range(1, int.MaxValue, ErrorMessage = "Quantity must be at least 1.")]
    public int Quantity { get; set; }
}
