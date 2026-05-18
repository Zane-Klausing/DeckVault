namespace DeckVault.Api.DTOs;

public class ScryfallCardDto
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Set { get; set; } = string.Empty;
    public ImageUrisDto? ImageUris { get; set; }
}

public class ImageUrisDto
{
    public string? Normal { get; set; }
}

public class ScryfallSearchResultDto
{
    public List<ScryfallCardDto> Data { get; set; } = [];
}
