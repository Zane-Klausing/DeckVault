using DeckVault.Api.Data;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddHttpClient("Scryfall", client =>
{
    client.BaseAddress = new Uri("https://api.scryfall.com/");
    client.DefaultRequestHeaders.Add("User-Agent", "DeckVault/1.0");
    client.DefaultRequestHeaders.Add("Accept", "application/json");
});
builder.Services.AddDbContext<DeckVaultContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

var allowedOrigins = builder.Configuration.GetSection("AllowedOrigins").Get<string[]>()
    ?? ["http://localhost:5173"];

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
        policy.WithOrigins(allowedOrigins)
              .AllowAnyHeader()
              .AllowAnyMethod());
});

var app = builder.Build();

app.UseHttpsRedirection();
app.UseCors();
app.MapControllers();

app.Run();
