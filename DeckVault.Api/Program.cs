// Pull in the application's data layer and EF Core
using DeckVault.Api.Data;
using Microsoft.EntityFrameworkCore;

// CreateBuilder sets up the host: reads config files (appsettings.json),
// environment variables, command-line args, and wires up logging
var builder = WebApplication.CreateBuilder(args);

// Register the MVC controller pipeline so ASP.NET can discover and route
// requests to controller classes (CardsController, DecksController, etc.)
builder.Services.AddControllers();

// Register a named HttpClient called "Scryfall" in the DI container.
// Any class that injects IHttpClientFactory can call CreateClient("Scryfall")
// and get a pre-configured client with the base URL and headers already set.
// This avoids setting headers on every request and centralises the config here.
builder.Services.AddHttpClient("Scryfall", client =>
{
    client.BaseAddress = new Uri("https://api.scryfall.com/");
    client.DefaultRequestHeaders.Add("User-Agent", "DeckVault/1.0");
    client.DefaultRequestHeaders.Add("Accept", "application/json");
});

// Register EF Core's DbContext (DeckVaultContext) with SQL Server.
// "DefaultConnection" refers to the key in appsettings.json → ConnectionStrings.
// ASP.NET injects DeckVaultContext into any controller that asks for it.
builder.Services.AddDbContext<DeckVaultContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

// Read the list of allowed CORS origins from config.
// In appsettings.json this is the "AllowedOrigins" array.
// In Azure, environment variables like AllowedOrigins__0 override that array at runtime.
// The ?? fallback kicks in if the key is missing entirely from config.
var allowedOrigins = builder.Configuration.GetSection("AllowedOrigins").Get<string[]>()
    ?? ["http://localhost:5173"];

// Register the CORS middleware and define the default policy.
// WithOrigins restricts which domains can call the API from a browser.
// AllowAnyHeader / AllowAnyMethod permit all HTTP methods and request headers
// from those origins — appropriate for an internal API consumed by our own frontend.
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
        policy.WithOrigins(allowedOrigins)
              .AllowAnyHeader()
              .AllowAnyMethod());
});

// Finalise the service registrations and build the runnable application object
var app = builder.Build();

// Redirect HTTP requests to HTTPS automatically
app.UseHttpsRedirection();

// Apply the CORS policy — must come before MapControllers so the headers
// are added to responses before the controller writes the body
app.UseCors();

// Wire up controller classes as HTTP endpoints based on their route attributes
app.MapControllers();

// Start the web server and block until the process is stopped
app.Run();
