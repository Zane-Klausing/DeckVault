namespace DeckVault.Api.Models;

public class CollectionEntry
{
    public int Id { get; set; }
    public int CardId { get; set; }
    public int Quantity { get; set; }
    public decimal PurchasePrice { get; set; }
    public DateOnly PurchaseDate { get; set; }

    public Card Card { get; set; } = null!;
}
