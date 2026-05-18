namespace DeckVault.Api.Models;

public class Card
{
    public int Id { get; set; }
    public string ScryfallId { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string SetCode { get; set; } = string.Empty;
    public string? ImageUrl { get; set; }

    public ICollection<CollectionEntry> CollectionEntries { get; set; } = [];
    public ICollection<DeckCard> DeckCards { get; set; } = [];
}
