namespace DeckVault.Api.DTOs;

public class CardResponse
{
    public int Id { get; set; }
    public string ScryfallId { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string SetCode { get; set; } = string.Empty;
    public string? ImageUrl { get; set; }
}
