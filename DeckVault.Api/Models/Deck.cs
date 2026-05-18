namespace DeckVault.Api.Models;

public class Deck
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Format { get; set; }
    public DateOnly CreatedDate { get; set; }

    public ICollection<DeckCard> DeckCards { get; set; } = [];
}
