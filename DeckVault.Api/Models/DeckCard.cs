namespace DeckVault.Api.Models;

public class DeckCard
{
    public int DeckId { get; set; }
    public int CardId { get; set; }
    public int Quantity { get; set; }

    public Deck Deck { get; set; } = null!;
    public Card Card { get; set; } = null!;
}
