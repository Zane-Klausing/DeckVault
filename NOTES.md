# DeckVault — Stack Notes

Personal learning notes for the .NET / C# / EF Core stack, written from the perspective of a Java / Groovy / Grails developer.

---

## The Big Picture Analogy

Grails is a single fat framework that bundles everything: web layer, ORM (GORM), DI container, and a build tool (Gradle). In .NET, those are separate but composable pieces.

| Grails concept | .NET equivalent | Notes |
|---|---|---|
| Grails framework | ASP.NET Core | The web framework |
| GORM | Entity Framework Core | The ORM |
| Groovy/Java class | C# class | Almost identical concepts |
| `grails-app/domain/` | `Models/` folder | Entity classes live here |
| `DataSource.groovy` | `appsettings.json` | DB connection config |
| `BuildConfig.groovy` / `build.gradle` | `.csproj` file | Dependency manifest |
| Maven / Gradle | NuGet | Package manager |
| Spring DI container | ASP.NET Core DI | Built in, same idea |
| `grails.util.Environment` | `ASPNETCORE_ENVIRONMENT` | Dev/Prod env switching |

---

## Project Structure

```
DeckVault/
  DeckVault.Api/
    Models/               C# classes that map to DB tables (like grails-app/domain/)
    Data/                 DbContext — the EF Core gateway to the database
    Controllers/          HTTP endpoints
    DTOs/                 Request and response shape classes
    Migrations/           Auto-generated SQL diff files — do not edit by hand
    Program.cs            App startup and service registration
    appsettings.json      Base config (connection strings, logging)
    appsettings.Development.json  Dev-only config overrides
    DeckVault.Api.csproj  Project file — dependencies and build settings
  deckvault-ui/           React + Vite frontend
    src/
      api/                Fetch wrappers — one file per domain
      components/         Shared UI components (NavBar, AddToCollectionModal)
      pages/              One component per route (Collection, Decks, Dashboard)
      App.jsx             Router setup
      index.css           CSS variables and global resets
    package.json          npm dependencies (react-router-dom, recharts)
  NOTES.md                This file
```

---

## File-by-File Breakdown

---

### `DeckVault.Api.csproj` — The Project File

Equivalent of `build.gradle`. Two jobs:

1. **Declares what this project is** — `Sdk="Microsoft.NET.Sdk.Web"` tells the build system this is a web app. That one attribute pulls in ASP.NET Core automatically.
2. **Declares dependencies** — `PackageReference` entries are NuGet dependencies, same as `compile 'group:artifact:version'` in Gradle.

```xml
<Project Sdk="Microsoft.NET.Sdk.Web">
  <PropertyGroup>
    <TargetFramework>net10.0</TargetFramework>
    <Nullable>enable</Nullable>
    <ImplicitUsings>enable</ImplicitUsings>
  </PropertyGroup>

  <ItemGroup>
    <PackageReference Include="Microsoft.EntityFrameworkCore.SqlServer" Version="9.*" />
    <PackageReference Include="Microsoft.EntityFrameworkCore.Tools" Version="9.*">
      <PrivateAssets>all</PrivateAssets>
    </PackageReference>
  </ItemGroup>
</Project>
```

**`Nullable>enable`** — C# 8+ nullable reference type system. The compiler tracks which variables can be null and warns you at compile time when you might dereference a null. `string?` means nullable; `string` means you're promising it won't be null. Eliminates most null pointer exceptions before they happen.

**`ImplicitUsings>enable`** — Automatically imports the most common namespaces (`System`, `System.Collections.Generic`, `System.Linq`, etc.) so you don't have to write them at the top of every file. Same idea as Groovy's automatic imports.

---

### The NuGet Packages

**`Microsoft.EntityFrameworkCore.SqlServer`** — EF Core ORM plus the SQL Server database driver. Equivalent to GORM + JDBC driver bundled together. It knows how to:
- Translate C# LINQ queries into SQL
- Talk to SQL Server specifically (separate packages exist for PostgreSQL, SQLite, etc.)
- Map C# types to SQL Server column types (`decimal`, `nvarchar`, `date`, etc.)

**`Microsoft.EntityFrameworkCore.Tools`** — Build-time-only package (`<PrivateAssets>all</PrivateAssets>` means it does not ship with the deployed app). It's what makes `dotnet ef` CLI commands work inside the project. Think of it as a Gradle plugin that adds migration tasks.

**`dotnet-ef` global tool** (installed separately with `dotnet tool install --global dotnet-ef`) — The CLI for EF Core. The two packages above handle the runtime ORM; `dotnet-ef` handles developer tooling (generating migrations, applying them, dropping the database, etc.). The global tool version **must match** the package version — mismatches cause runtime errors. We use 9.0.16 for both because EF Core 10 is still pre-release.

---

### `appsettings.json` and `appsettings.Development.json` — Configuration

Equivalent of `DataSource.groovy`. ASP.NET Core has a layered config system that loads in this order, with each layer overriding the previous:

1. `appsettings.json` — base config, always loaded
2. `appsettings.Development.json` — overrides, loaded only when `ASPNETCORE_ENVIRONMENT=Development`
3. Environment variables — override everything above
4. User secrets — local dev overrides that never touch a committed file

```json
{
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft.AspNetCore": "Warning"
    }
  },
  "AllowedHosts": "*",
  "ConnectionStrings": {
    "DefaultConnection": "Server=(localdb)\\MSSQLLocalDB;Database=DeckVault;Trusted_Connection=True;"
  }
}
```

**Why Azure uses environment variables for the prod connection string:** Azure App Service lets you set config values in the portal as environment variables. When the app runs, `ConnectionStrings__DefaultConnection` (double underscore = JSON nesting) overwrites the file value. This means the production connection string is never committed to the repo — it lives only in Azure.

**LocalDB** (`(localdb)\\MSSQLLocalDB`) — A lightweight SQL Server process that starts on demand. Only accessible from the local machine. Zero configuration for local dev. `Trusted_Connection=True` = Windows Authentication, no username/password needed.

---

### `Program.cs` — Application Bootstrap

This single file replaced the old two-file `Startup.cs` + `Program.cs` pattern from older .NET versions. It has two distinct phases.

```csharp
var builder = WebApplication.CreateBuilder(args);

// Phase 1: Register services with the DI container
builder.Services.AddControllers();
builder.Services.AddHttpClient("Scryfall", client =>
{
    client.BaseAddress = new Uri("https://api.scryfall.com/");
    client.DefaultRequestHeaders.Add("User-Agent", "DeckVault/1.0");
    client.DefaultRequestHeaders.Add("Accept", "application/json");
});
builder.Services.AddDbContext<DeckVaultContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
        policy.WithOrigins("http://localhost:5173")
              .AllowAnyHeader()
              .AllowAnyMethod());
});

var app = builder.Build();

// Phase 2: Build the HTTP middleware pipeline
app.UseHttpsRedirection();
app.UseCors();
app.MapControllers();

app.Run();
```

#### Phase 1: Service Registration

`builder.Services` is the **dependency injection container** — the same concept as Spring's ApplicationContext in Grails. You register things here; the framework injects them into your controllers automatically when it creates them.

| Registration | What it does |
|---|---|
| `AddControllers()` | Scans for classes inheriting `ControllerBase` and registers them to handle HTTP requests |
| `AddHttpClient("Scryfall", ...)` | Registers a **named** `IHttpClientFactory` client with a pre-configured `BaseAddress`, `User-Agent`, and `Accept` header. Controllers request it by name; no per-request header mutation needed. |
| `AddDbContext<DeckVaultContext>(...)` | Registers `DeckVaultContext` with a **scoped** lifetime (one instance per HTTP request). Passes the connection string to EF. |
| `AddCors(...)` | Registers a CORS policy allowing the React dev server at port 5173 to call this API. Browsers block cross-origin requests without this. |

#### Phase 2: Middleware Pipeline

`var app = builder.Build()` finalizes the DI container and creates the runnable app.

After this, you build the **middleware pipeline** — a chain of components every HTTP request passes through in order. Think of it like Grails filters, but explicit. **Order matters.**

| Middleware | What it does |
|---|---|
| `UseHttpsRedirection()` | Redirects HTTP requests to HTTPS |
| `UseCors()` | Attaches CORS headers to responses — must come before `MapControllers` |
| `MapControllers()` | Wires controller routes — incoming requests match to action methods |

---

### `Models/` — The Domain Layer

Equivalent to `grails-app/domain/`. In Grails, domain classes get GORM magic via annotations and conventions. EF Core works the same way — it uses **conventions** to infer table structure from your C# classes.

```csharp
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
```

**`{ get; set; }`** — C# auto-property syntax. In Groovy you write `String name` and getters/setters are generated. In C#, `{ get; set; }` is the explicit but still auto-generated form.

**`= string.Empty`** — Default value. Required because `Nullable>enable` means non-nullable properties must be initialized. `string.Empty` is `""`.

**`= []`** — C# 12 shorthand for `new List<T>()`. Initializes an empty collection so the property is never null. EF populates it from the database when you load related data.

**`= null!`** — Used on navigation properties like `public Card Card { get; set; } = null!`. The `!` is the null-forgiving operator — it tells the compiler "I know this looks nullable, but EF will always set it at runtime, trust me." Without it, the compiler would warn that a non-nullable property is uninitialized.

**Navigation properties** — `ICollection<CollectionEntry> CollectionEntries` on `Card` does not create a column in the database. EF uses it to understand the relationship between tables and knows how to generate JOINs. When you query a `Card` and call `.Include(c => c.CollectionEntries)`, EF writes the JOIN SQL for you.

**Foreign key + navigation property pair** — `CollectionEntry` has both `CardId` (the int FK column) and `Card` (the loaded object). EF sees both and connects them automatically. `CardId` is what's stored in the database; `Card` is the hydrated object in memory.

**`DeckCard` has no `Id`** — It's the many-to-many join table between `Decks` and `Cards`. Its primary key is the combination of `DeckId + CardId` (composite key). This must be declared explicitly in `OnModelCreating` because EF can't infer it from convention.

---

### `Data/DeckVaultContext.cs` — The ORM Gateway

Equivalent to Grails' data source + GORM session combined. Every database interaction goes through this class.

```csharp
public class DeckVaultContext(DbContextOptions<DeckVaultContext> options) : DbContext(options)
{
    public DbSet<Card> Cards => Set<Card>();
    public DbSet<CollectionEntry> CollectionEntries => Set<CollectionEntry>();
    public DbSet<Deck> Decks => Set<Deck>();
    public DbSet<DeckCard> DeckCards => Set<DeckCard>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<DeckCard>()
            .HasKey(dc => new { dc.DeckId, dc.CardId });

        modelBuilder.Entity<CollectionEntry>()
            .Property(ce => ce.PurchasePrice)
            .HasColumnType("decimal(10,2)");

        modelBuilder.Entity<Card>(entity =>
        {
            entity.HasIndex(c => c.ScryfallId).IsUnique();
            entity.Property(c => c.ScryfallId).HasMaxLength(36);
            entity.Property(c => c.Name).HasMaxLength(200);
            entity.Property(c => c.SetCode).HasMaxLength(10);
            entity.Property(c => c.ImageUrl).HasMaxLength(500);
        });

        modelBuilder.Entity<Deck>(entity =>
        {
            entity.Property(d => d.Name).HasMaxLength(100);
            entity.Property(d => d.Format).HasMaxLength(50);
        });
    }
}
```

**Primary constructor syntax** — `(DbContextOptions<DeckVaultContext> options) : DbContext(options)` is C# 12 shorthand. It declares a constructor that takes `options` and passes it to the base class `DbContext`. In older C# you'd write a full constructor body. Same result.

**`DbSet<T>`** — Each property represents a table. It's the entry point for LINQ queries.

```csharp
// This:
Cards.Where(c => c.Name.Contains("Dragon")).ToList()

// Translates to:
// SELECT * FROM Cards WHERE Name LIKE '%Dragon%'

// Equivalent Grails/GORM:
// Card.findAllByNameLike('%Dragon%')
```

**`OnModelCreating`** — The place to configure things EF can't infer from conventions:
- `HasKey(dc => new { dc.DeckId, dc.CardId })` — declares the composite PK for `DeckCard`
- `HasColumnType("decimal(10,2)")` — overrides EF's default `decimal(18,2)` for money values
- `HasIndex(c => c.ScryfallId).IsUnique()` — tells EF to create a `UNIQUE` index on `ScryfallId`. Without it, two concurrent requests could both pass the `FirstOrDefaultAsync` check before either inserts, and you'd end up with duplicate card rows. The unique index is the database's last line of defence: even if application logic fails to catch it, the insert will be rejected at the DB level.
- `HasMaxLength(36)` / `HasMaxLength(200)` / etc. — without explicit limits, EF generates `nvarchar(max)` columns in SQL Server. Those columns cannot be efficiently indexed and waste storage. Bounded columns (`nvarchar(36)` for a UUID, `nvarchar(200)` for a card name, etc.) also self-document the expected data shape — future developers reading the migration can see at a glance what the system expects.

After adding these constraints, a new migration (`AddConstraints`) was generated with `dotnet ef migrations add AddConstraints` and applied with `dotnet ef database update`.

---

### `Migrations/` — The Schema History

Three files are generated when you run `dotnet ef migrations add <Name>`:

**`<timestamp>_Initial.cs`** — The migration itself. Contains `Up()` (apply the change) and `Down()` (reverse it). EF generates all of this SQL from your model classes. You can edit migrations by hand if needed, but rarely do.

**`<timestamp>_Initial.Designer.cs`** — EF's internal snapshot. Do not touch.

**`DeckVaultContextModelSnapshot.cs`** — Snapshot of the current model state. When you add the next migration, EF diffs your current models against this file to figure out what changed and what SQL to generate. Do not touch.

**`__EFMigrationsHistory` table** — Created in the database by EF. Records which migrations have been applied. `dotnet ef database update` reads this table and only runs migrations not yet recorded. This is how you safely evolve a production schema — each schema change is a new migration file, applied once and recorded.

---

## Key EF Core Commands

```powershell
# Generate a new migration after changing model classes
dotnet ef migrations add <MigrationName>

# Apply pending migrations to the database
dotnet ef database update

# Roll back to a specific migration (runs Down() on everything after it)
dotnet ef database update <MigrationName>

# Remove the last migration (only if not yet applied to the database)
dotnet ef migrations remove

# View all migrations and their applied status
dotnet ef migrations list
```

---

## The Request Lifecycle

```
React (port 5173)
  → HTTP POST /api/collection
  → ASP.NET Core receives request
  → UseHttpsRedirection     (pass-through for https)
  → UseCors                 (adds CORS headers so browser accepts the response)
  → MapControllers          (routes to CollectionController.Add action method)
  → DI injects DeckVaultContext into CollectionController constructor
  → Controller runs LINQ query via DbContext
  → EF Core translates LINQ to SQL, sends to LocalDB
  → Result serialized to JSON, returned as HTTP 201 Created
  → React receives and renders response
```

---

## DTOs (Data Transfer Objects)

**Why not return model classes directly from the API?**

Two reasons:
1. **Circular references** — `Card` has `CollectionEntries`, and `CollectionEntry` has a `Card`, which has `CollectionEntries`... The JSON serializer loops forever. DTOs break the cycle by only carrying the fields you explicitly choose.
2. **Encapsulation** — Your DB shape and your API shape are different concerns. A model class may gain internal fields (audit columns, soft-delete flags) that you never want exposed. DTOs let you control exactly what leaves the API.

DTOs live in `DTOs/` and are plain C# classes with no EF dependency. There are two kinds:

**Request DTOs** — Describe the shape of what the API *receives* (request body from the client).
**Response DTOs** — Describe the shape of what the API *returns* (JSON in the HTTP response).

```csharp
// Request — what the client sends when adding a card to the collection
public class AddToCollectionRequest
{
    public string ScryfallId { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string SetCode { get; set; } = string.Empty;
    public string? ImageUrl { get; set; }
    public int Quantity { get; set; }
    public decimal PurchasePrice { get; set; }
    public DateOnly PurchaseDate { get; set; }
}

// Response — what the API returns after a successful add
public class CollectionEntryResponse
{
    public int Id { get; set; }
    public int CardId { get; set; }
    public string CardName { get; set; } = string.Empty;  // flattened from Card.Name
    public string SetCode { get; set; } = string.Empty;
    public string? ImageUrl { get; set; }
    public int Quantity { get; set; }
    public decimal PurchasePrice { get; set; }
    public DateOnly PurchaseDate { get; set; }
}
```

`CardName` is a good example of a DTO doing work: the database stores the name on the `Cards` table, but the response flattens it directly onto the entry so the client doesn't have to do a second lookup.

### DTO Validation Annotations

Request DTOs use `[Required]` and `[Range]` data annotation attributes to declare constraints:

```csharp
public class AddToCollectionRequest
{
    [Required]
    public string ScryfallId { get; set; } = string.Empty;

    [Range(1, int.MaxValue, ErrorMessage = "Quantity must be at least 1.")]
    public int Quantity { get; set; }

    [Range(0, double.MaxValue, ErrorMessage = "Purchase price cannot be negative.")]
    public decimal PurchasePrice { get; set; }
}
```

Because the controller carries `[ApiController]`, ASP.NET Core validates the request body against these annotations **before the action method runs**. If validation fails, it automatically returns HTTP 400 with a structured `ProblemDetails` JSON body — no manual validation code in the controller needed.

This is the same idea as Grails domain class constraints (`constraints { name blank: false; quantity min: 1 }`), but applied to the DTO layer rather than the domain model, and enforced at the HTTP boundary rather than at the persistence layer.

---

## Controllers

Controllers live in `Controllers/` and inherit from `ControllerBase`. Each public method decorated with an HTTP verb attribute (`[HttpGet]`, `[HttpPost]`, etc.) becomes a route handler. This is equivalent to a Grails controller action.

### Key Attributes

**`[ApiController]`** — Applied to the class. Enables:
- Automatic 400 Bad Request when the request body fails validation
- Automatic binding of request body from JSON (no need to manually deserialize)
- Opinionated error responses

**`[Route("api/[controller]")]`** — Sets the base URL. `[controller]` is a token replaced with the class name minus "Controller": `CardsController` → `/api/cards`. Every action's route is relative to this base.

**`[HttpGet]`, `[HttpPost]`, `[HttpDelete]`** — Map the method to an HTTP verb. An optional string argument appends to the route: `[HttpGet("search")]` on `CardsController` maps to `GET /api/cards/search`.

**`[FromQuery]`** — Bind a parameter from the query string (`?q=value`). Without it, ASP.NET Core looks in the route path.

**`[FromBody]`** — Bind a parameter from the JSON request body. Required for POST/PUT actions that receive data.

**`{id}` in routes** — Route parameter. `[HttpDelete("{id}")]` makes `id` available as a method parameter automatically.

### Return Types and HTTP Status Codes

`IActionResult` is the return type for all controller actions. The helper methods on `ControllerBase` produce the correct HTTP status code:

| Method | HTTP Status | When to use |
|---|---|---|
| `Ok(data)` | 200 | Successful GET |
| `CreatedAtAction(...)` | 201 | Successful POST that created a resource |
| `NoContent()` | 204 | Successful DELETE or PUT with no response body |
| `BadRequest(msg)` | 400 | Client sent invalid data |
| `NotFound()` | 404 | Requested resource doesn't exist |

### Dependency Injection in Controllers

Controllers use the **primary constructor** syntax to receive dependencies:

```csharp
public class CollectionController(DeckVaultContext db) : ControllerBase
```

The DI container sees that `CollectionController` needs a `DeckVaultContext`, looks it up from its registrations (we called `AddDbContext` in `Program.cs`), and injects it. No `new` keyword, no manual wiring. This is identical to `@Autowired` in Spring.

---

## CardsController — Scryfall Proxy

```csharp
[HttpGet("search")]
public async Task<IActionResult> Search([FromQuery] string q)
{
    var client = httpClientFactory.CreateClient("Scryfall");

    var response = await client.GetAsync($"cards/search?q={Uri.EscapeDataString(q)}");

    if (response.StatusCode == System.Net.HttpStatusCode.NotFound)
        return Ok(Array.Empty<ScryfallCardDto>());

    if (!response.IsSuccessStatusCode)
        return StatusCode(502, "Scryfall search failed.");

    var json = await response.Content.ReadAsStringAsync();
    var result = JsonSerializer.Deserialize<ScryfallSearchResultDto>(json, JsonOptions);

    return Ok(result?.Data ?? []);
}
```

**`IHttpClientFactory`** — Retrieved from DI. Never use `new HttpClient()` directly — it doesn't release socket connections properly and causes connection exhaustion under load. `httpClientFactory.CreateClient("Scryfall")` pulls the pre-configured named client from the managed pool — `BaseAddress`, `User-Agent`, and `Accept` are already set; no per-request header mutation needed.

**`User-Agent` and `Accept` headers** — Scryfall's API **requires both**. Omitting either returns HTTP 400. These are now set once at registration in `Program.cs` rather than on every request.

**Relative URL** — Because `BaseAddress` is set to `https://api.scryfall.com/`, the request URL is just `cards/search?q=...`. `HttpClient` combines them. If `BaseAddress` were ever changed, you'd update it in one place.

**`Uri.EscapeDataString(q)`** — URL-encodes the search string before appending it to the Scryfall URL (spaces → `%20`, etc.). Without this, special characters would break the URL.

**Error handling:**
- Scryfall returns 404 when a search matches zero cards (not an error — it means "no results"). Returning that 404 to the client would look like our endpoint doesn't exist. Instead we return `Ok(Array.Empty<ScryfallCardDto>())` — an empty list with HTTP 200.
- Any other non-success response returns **502 Bad Gateway**. This is the correct status code when *our server* failed to successfully call an *upstream server* on the client's behalf. Using a passthrough like `StatusCode((int)response.StatusCode)` leaks Scryfall's internal codes to our callers and conflates Scryfall's problems with ours.

**`JsonNamingPolicy.SnakeCaseLower`** — Scryfall returns `snake_case` JSON keys (`image_uris`, `set`). C# classes use `PascalCase`. This serializer option maps between them automatically during deserialization: `image_uris` → `ImageUris`.

**`JsonOptions` is `private static readonly`** — Declared once with an object initializer and shared across all requests. This makes it effectively immutable and avoids re-allocating the options object on every call. (`MakeReadOnly()` was considered but requires a `TypeInfoResolver` to be configured first, which conflicts with .NET 10's default setup.)

**LINQ projection in `GetAll`:**
```csharp
var cards = await db.Cards
    .Select(c => new CardResponse { ... })
    .ToListAsync();
```
`.Select()` before `.ToListAsync()` generates a `SELECT` with only the columns you need rather than `SELECT *`. The projection target is a `CardResponse` DTO rather than an anonymous type, so the shape is named and reusable.

---

## CollectionController — Collection CRUD

### Eager Loading with `.Include()`

```csharp
var entries = await db.CollectionEntries
    .Include(e => e.Card)
    .Select(e => new CollectionEntryResponse { ... })
    .ToListAsync();
```

Without `.Include(e => e.Card)`, the `e.Card` navigation property is `null` at runtime even though a row exists in the `Cards` table. EF does not follow relationships unless explicitly told to. `.Include()` generates a SQL JOIN.

In GORM terms this is equivalent to `fetchMode = FetchMode.JOIN` or `lazy: false`.

### Upsert Pattern — Card Deduplication

```csharp
var card = await db.Cards.FirstOrDefaultAsync(c => c.ScryfallId == request.ScryfallId);

if (card is null)
{
    card = new Card { ... };
    db.Cards.Add(card);
}

var entry = new CollectionEntry { Card = card, ... };  // navigation property
db.CollectionEntries.Add(entry);
await db.SaveChangesAsync();  // single save — EF resolves the graph
```

The same physical card (e.g., "Lightning Bolt") should only exist once in the `Cards` table regardless of how many times you add it to your collection. Each purchase is a separate `CollectionEntry` row. We check by `ScryfallId` (the Scryfall UUID) which is stable and unique per card printing.

### `SaveChangesAsync()` and the Navigation Property Trick

EF batches all pending changes (Adds, Removes, updates to tracked entities) and commits them in a single database transaction when you call this. Nothing touches the database until you call it. This is EF's **Unit of Work** pattern — equivalent to Grails' `save(flush: true)`.

The `Add` method now calls `SaveChangesAsync()` only once. The key is setting the **navigation property** `Card = card` on the new `CollectionEntry` instead of setting `CardId = card.Id`.

When you assign the navigation property, EF sees that both `card` and `entry` are tracked objects in the same context. At save time it knows: "I need to insert `card` first to get its generated `Id`, then insert `entry` using that `Id` as the foreign key." It resolves that dependency order automatically and wraps both inserts in a single transaction.

In GORM terms, this is similar to assigning a domain object reference (`entry.card = card`) and letting GORM cascade the save — but in EF it's driven by change tracking rather than cascade configuration. The two-save approach (insert card, get id, then insert entry) still works, but is unnecessary when you use navigation properties correctly.

### `FindAsync(id)`

Shorthand for looking up by primary key. Checks EF's in-memory change tracker first, then hits the database. Equivalent to `Entity.get(id)` in GORM.

---

## DecksController — Decks and Card Assignment

### Chained Eager Loading with `.ThenInclude()`

```csharp
var deck = await db.Decks
    .Include(d => d.DeckCards)
        .ThenInclude(dc => dc.Card)
    .FirstOrDefaultAsync(d => d.Id == id);
```

`.Include(d => d.DeckCards)` follows the first relationship: `Decks → DeckCards`.
`.ThenInclude(dc => dc.Card)` follows the relationship one level deeper: `DeckCards → Cards`.

This produces a two-join SQL query. Without `.ThenInclude()`, `dc.Card` would be `null`.

### `AnyAsync()`

```csharp
var deckExists = await db.Decks.AnyAsync(d => d.Id == id);
```

Generates `SELECT CASE WHEN EXISTS(SELECT 1 FROM Decks WHERE Id = @id) THEN 1 ELSE 0 END`. More efficient than `FirstOrDefaultAsync` when you only need to confirm existence — no need to load any columns.

### Upsert Pattern — Card Quantity in Deck

```csharp
var existing = await db.DeckCards
    .FirstOrDefaultAsync(dc => dc.DeckId == id && dc.CardId == request.CardId);

if (existing is not null)
    existing.Quantity = request.Quantity;
else
    db.DeckCards.Add(new DeckCard { DeckId = id, CardId = request.CardId, Quantity = request.Quantity });

await db.SaveChangesAsync();
```

`DeckCard` has a composite primary key `(DeckId, CardId)`. Inserting a duplicate would throw a database constraint violation. Instead we check first: if the card is already in the deck, update its quantity; if not, insert a new row. EF detects that `existing.Quantity` was changed on a tracked entity and automatically generates an `UPDATE` statement — no explicit update call needed.

### Delete Endpoints

**`DELETE /api/decks/{id}`** — Deletes a deck by ID.

```csharp
[HttpDelete("{id}")]
public async Task<IActionResult> Delete(int id)
{
    var deck = await db.Decks.FindAsync(id);
    if (deck is null) return NotFound();

    db.Decks.Remove(deck);
    await db.SaveChangesAsync();
    return NoContent();
}
```

Because `DeckCard.DeckId` is a required foreign key, EF Core configures **cascade delete** on that relationship by convention. When the `Deck` row is deleted, the database automatically deletes all its `DeckCard` rows — no manual cleanup needed in the controller.

**`DELETE /api/decks/{id}/cards/{cardId}`** — Removes a specific card from a deck.

```csharp
[HttpDelete("{id}/cards/{cardId}")]
public async Task<IActionResult> RemoveCard(int id, int cardId)
{
    var deckCard = await db.DeckCards
        .FirstOrDefaultAsync(dc => dc.DeckId == id && dc.CardId == cardId);

    if (deckCard is null) return NotFound();

    db.DeckCards.Remove(deckCard);
    await db.SaveChangesAsync();
    return NoContent();
}
```

Because `DeckCard` has a composite primary key there is no single `Id` to pass to `FindAsync`. Instead, `FirstOrDefaultAsync` filters on both key columns to find the join-table row, then removes it.

**`BadRequest` vs `NotFound`** — The "card not found" case in `AddCard` returns `NotFound()` (404), not `BadRequest()` (400). These are different things: 400 means the client sent malformed or logically invalid data; 404 means a resource the client referenced does not exist. Returning 400 when a card ID simply isn't in the database is a common mistake — it makes the client think it did something wrong when the resource just isn't there.

---

## Complete API Endpoint Reference

| Method | Route | Action |
|---|---|---|
| `GET` | `/api/cards` | List cards stored in local DB |
| `GET` | `/api/cards/search?q=` | Proxy search to Scryfall |
| `GET` | `/api/collection` | List all collection entries with card details |
| `POST` | `/api/collection` | Add a card to your collection |
| `DELETE` | `/api/collection/{id}` | Remove a collection entry |
| `GET` | `/api/decks` | List all decks |
| `GET` | `/api/decks/{id}` | Get one deck with its full card list |
| `POST` | `/api/decks` | Create a deck |
| `POST` | `/api/decks/{id}/cards` | Add or update a card in a deck |
| `DELETE` | `/api/decks/{id}` | Delete a deck and all its card assignments |
| `DELETE` | `/api/decks/{id}/cards/{cardId}` | Remove a card from a deck |

---

## What's Not Built Yet

| Thing | Status |
|---|---|
| Azure deployment | Sunday AM |
| Power BI dashboard | Sunday PM |
| Swagger / OpenAPI | Excluded (`--no-openapi`) to keep things simple |

---

## React Frontend

---

### What React and Vite Are

**React** — A JavaScript UI library (not a full framework). You build the UI as a tree of **components** — functions that return HTML-like markup (JSX) and re-render automatically when their data changes. React handles the DOM updates; you just describe what the UI should look like given the current state.

**Vite** — The build tool and dev server. Equivalent to what Webpack + Gradle's `bootRun` does together in a Grails project. It:
- Serves the app locally with hot module replacement (changes appear in the browser instantly without a full reload)
- Bundles and minifies everything for production (`npm run build`)
- Scaffolds the project structure with `npm create vite@latest`

**Analogy to Grails:** React components are like GSP views, but instead of server-rendering HTML on each request, React renders entirely in the browser. The server (your .NET API) just provides JSON; the browser handles all the HTML construction.

---

### Project Structure

```
deckvault-ui/
  public/                 Static files served as-is
  src/
    api/                  All API communication — one file per domain
      client.js           Base fetch wrapper (URL, headers, error handling)
      cards.js            searchCards(q), getCards()
      collection.js       getCollection(), addToCollection(data), deleteEntry(id)
      decks.js            getDecks(), getDeck(id), createDeck(data), addCardToDeck(deckId, data)
    components/           Reusable UI pieces shared across pages
      NavBar.jsx + NavBar.css
      AddToCollectionModal.jsx + AddToCollectionModal.css
    pages/                One component per route
      Collection.jsx + Collection.css
      Decks.jsx + Decks.css
      Dashboard.jsx + Dashboard.css
    App.jsx               Router setup — maps URL paths to page components
    App.css               Global layout (max-width, padding)
    main.jsx              Entry point — mounts the React app into index.html
    index.css             CSS variables, resets, global element styles
  index.html              Single HTML file — React mounts into <div id="root">
  package.json            npm equivalent of build.gradle
  vite.config.js          Vite build configuration
```

**`index.html` + `main.jsx`** — The entire app runs inside one `<div id="root">` in `index.html`. `main.jsx` calls `ReactDOM.createRoot(document.getElementById('root')).render(<App />)` to mount the component tree. Every page, modal, and nav bar is a React component inside that single div.

**`package.json`** — Equivalent of `build.gradle`. Lists dependencies (`react-router-dom`, `recharts`) and scripts (`npm run dev`, `npm run build`).

---

### npm Packages Installed

**`react-router-dom`** — Client-side routing. Without it, navigating to `/decks` would be a real browser request that returns a 404 (there's no server at that path). React Router intercepts the navigation and renders the right component instead, keeping the user in the single-page app.

**`recharts`** — A charting library built on D3 and React. Provides `BarChart`, `LineChart`, and other chart components that work as normal React components. Used on the Dashboard for the top-cards bar chart and cumulative spend line chart.

---

### JSX — HTML Inside JavaScript

JSX is a syntax extension that lets you write HTML-like markup directly in JavaScript. Vite compiles it to plain JavaScript `React.createElement()` calls.

```jsx
// JSX (what you write)
function Greeting({ name }) {
  return <h1 className="title">Hello, {name}</h1>;
}

// What Vite compiles it to
function Greeting({ name }) {
  return React.createElement('h1', { className: 'title' }, 'Hello, ', name);
}
```

Key differences from HTML:
- `className` instead of `class` (because `class` is a reserved JavaScript keyword)
- Expressions in `{}` — any valid JavaScript expression can go inside curly braces
- Self-closing tags must close: `<img />` not `<img>`
- A component must return a single root element (or a `<>...</>` Fragment)

---

### React Hooks

Hooks are functions that give function components access to state and lifecycle events. The name always starts with `use`.

#### `useState`

Declares a piece of state. Returns the current value and a setter function.

```jsx
const [query, setQuery] = useState('');  // initial value is ''
```

When you call `setQuery('lightning bolt')`, React re-renders the component with the new value. This is equivalent to a field in a Grails controller action that causes a GSP re-render — except it happens in the browser, not on the server.

**Never mutate state directly** — always use the setter. `query = 'foo'` does nothing; `setQuery('foo')` triggers a re-render.

#### `useEffect`

Runs side effects (API calls, subscriptions) after the component renders.

```jsx
useEffect(() => {
  getCollection().then(setCollection);
}, []);  // empty array = run once on mount, equivalent to @PostConstruct
```

The second argument is the **dependency array**:
- `[]` — run once when the component first mounts
- `[someValue]` — run whenever `someValue` changes
- Omitted — run after every render (rarely what you want)

#### `useCallback`

Memoizes a function so it doesn't get recreated on every render. Used when a function is a dependency of `useEffect` — without it, the effect would re-run infinitely because a new function object is created on every render.

```jsx
const loadCollection = useCallback(async () => {
  const data = await getCollection();
  setCollection(data);
}, []);  // no dependencies = stable reference, created once

useEffect(() => { loadCollection(); }, [loadCollection]);
```

---

### The API Client Layer

All API communication is centralized in `src/api/`. Pages never call `fetch()` directly.

**`client.js`** — The base wrapper. Sets the API base URL, attaches `Content-Type`, handles errors, and handles 204 No Content responses (which have no body to parse).

```js
const BASE = 'http://localhost:5002/api';

export async function apiFetch(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  if (res.status === 204) return null;  // DELETE returns 204 with no body
  return res.json();
}
```

**Domain modules** wrap `apiFetch` with named, typed functions:

```js
// collection.js
export const getCollection = () => apiFetch('/collection');

export const addToCollection = (data) =>
  apiFetch('/collection', { method: 'POST', body: JSON.stringify(data) });

export const deleteEntry = (id) =>
  apiFetch(`/collection/${id}`, { method: 'DELETE' });
```

**Why this pattern?** If the API URL or auth header ever changes, you change it in one place (`client.js`), not scattered across every page. Pages just call `getCollection()` — they don't know or care what URL that maps to.

---

### React Router

Defined in `App.jsx`. Maps URL paths to page components. The browser URL changes but no full page load happens.

```jsx
<Router>
  <NavBar />           {/* always visible */}
  <main>
    <Routes>
      <Route path="/" element={<Navigate to="/collection" replace />} />
      <Route path="/collection" element={<Collection />} />
      <Route path="/decks" element={<Decks />} />
      <Route path="/dashboard" element={<Dashboard />} />
    </Routes>
  </main>
</Router>
```

**`<NavLink>`** in `NavBar.jsx` — Like `<a>` but automatically adds an `active` CSS class when the current URL matches its `to` prop. Used to highlight the current page in the nav.

**`<Navigate>`** — Immediately redirects. The root `/` route redirects to `/collection` so the app always lands on the Collection page.

---

### Collection Page — Key Patterns

**Controlled input** — The search box is a *controlled* input: React owns the value, not the DOM.

```jsx
const [query, setQuery] = useState('');
<input value={query} onChange={(e) => setQuery(e.target.value)} />
```

Every keystroke calls `setQuery`, which re-renders the component with the new value. The input always shows exactly what React says it should. This is the React equivalent of data binding in frameworks like Angular or Grails' `<g:field>`.

**Optimistic UI on delete** — After a successful DELETE, the entry is removed from local state immediately without re-fetching the whole collection:

```jsx
setCollection((prev) => prev.filter((e) => e.id !== id));
```

`prev => prev.filter(...)` is the functional update form — use this when new state depends on old state, because React may batch state updates.

---

### AddToCollectionModal — Component Composition

The modal is a separate component that receives the card being added as a **prop** and calls back to the parent when done.

```jsx
// Parent (Collection.jsx) renders the modal
{addingCard && (
  <AddToCollectionModal
    card={addingCard}
    onClose={() => setAddingCard(null)}
    onAdded={loadCollection}
  />
)}
```

**Props** — Data passed from parent to child (read-only in the child). Equivalent to passing parameters to a method. `card` provides the Scryfall data; `onClose` and `onAdded` are callback functions the modal calls when the user cancels or successfully adds.

**`e.stopPropagation()`** — The overlay div has an `onClick={onClose}` so clicking outside the modal closes it. The inner modal div calls `e.stopPropagation()` to prevent that click from bubbling up to the overlay.

---

### Dashboard Page — Client-Side Data Computation

No new API endpoints were needed. The Dashboard fetches the same `GET /api/collection` and `GET /api/decks` data and computes everything in JavaScript.

**KPI values:**
```js
const totalValue = collection.reduce((sum, e) => sum + e.quantity * e.purchasePrice, 0);
const totalCards = collection.reduce((sum, e) => sum + e.quantity, 0);
```

**Bar chart data** — Sort by value descending, take top 10:
```js
const barData = [...collection]
  .map((e) => ({ name: e.cardName, value: e.quantity * e.purchasePrice }))
  .sort((a, b) => b.value - a.value)
  .slice(0, 10);
```

**Line chart data** — Cumulative spend over time. Sort by purchase date, then accumulate:
```js
const lineData = (() => {
  const sorted = [...collection].sort((a, b) => a.purchaseDate.localeCompare(b.purchaseDate));
  let cumulative = 0;
  return sorted.map((e) => {
    cumulative += e.quantity * e.purchasePrice;
    return { date: e.purchaseDate, total: parseFloat(cumulative.toFixed(2)) };
  });
})();
```

`[...collection]` — Spread into a new array before sorting. `.sort()` mutates in place; sorting React state directly would cause subtle bugs.

**Recharts usage:**
```jsx
<ResponsiveContainer width="100%" height={260}>
  <BarChart data={barData}>
    <XAxis dataKey="name" />
    <YAxis tickFormatter={(v) => `$${v}`} />
    <Tooltip />
    <Bar dataKey="value" fill="#c9a84c" />
  </BarChart>
</ResponsiveContainer>
```

`ResponsiveContainer` makes the chart fill its parent width automatically. `dataKey` tells each axis/bar which field in the data array to read.

---

### Styling Approach

**CSS variables** defined on `:root` in `index.css` — referenced everywhere as `var(--gold)`, `var(--surface)`, etc. Changing the colour scheme means editing one block.

**One CSS file per component/page** — imported directly in the JSX file (`import './Collection.css'`). Vite bundles them all. There's no scoping (unlike CSS Modules or styled-components) — class names are global, so they're prefixed by component (`.collection-page`, `.deck-list-panel`, etc.) to avoid collisions.

**CSS Grid for card layouts:**
```css
.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 1rem;
}
```
`auto-fill` + `minmax` means "fit as many 160px columns as will fit, stretch them to fill the remaining space." The grid responds to container width with no media queries needed.

---

## What's Not Built Yet

| Thing | Status |
|---|---|
| Azure deployment | Sunday AM |
| Power BI dashboard | Sunday PM |
| Swagger / OpenAPI | Excluded (`--no-openapi`) to keep things simple |

---

## Azure Deployment

---

### Overview

Three Azure resources host the app:

| Resource | Service | Region | Tier |
|---|---|---|---|
| SQL Server + Database | Azure SQL | West US | Basic (~$5/month) |
| .NET API | Azure App Service | Central US | F1 (Free) |
| React frontend | Azure Static Web Apps | Central US | Free |

The SQL Server and App Service ended up in different regions because free Azure subscriptions have per-region VM quotas, and East US and West US were both at capacity for App Service. Cross-region connections between Azure SQL and App Service work fine — there is minor additional latency but it is not significant for a portfolio app.

---

### Prerequisites

**Azure CLI** — the command-line tool for provisioning and managing Azure resources. Installed via `winget install Microsoft.AzureCLI`. Equivalent to the `gcloud` CLI for Google Cloud or `aws` for AWS.

**Azure subscription** — new accounts at azure.microsoft.com/free get $200 credit for 30 days, 12 months of free services, and always-free tiers (Static Web Apps is always free; App Service F1 and Azure SQL Basic are free for 12 months). A credit card is required for identity verification but is not charged if you stay within free-tier limits.

**Resource provider registration** — Azure organizes services into namespaces (`Microsoft.Sql`, `Microsoft.Web`, etc.). New subscriptions do not have all providers enabled. Running `az sql server create` on a fresh account produces a `MissingSubscriptionRegistration` error. Fix: `az provider register --namespace Microsoft.Sql --wait`. The `Microsoft.Web` provider (App Service) auto-registers itself when you run the plan creation command.

---

### Login and Variable Setup

```powershell
az login
```

Opens a browser for Microsoft account authentication. After login, the CLI lists available subscriptions. Press Enter to select the default.

Variables are set once so every command below can reference them by name:

```powershell
$rg     = "deckvault-rg-west"
$loc    = "westus"
$sql    = "deckvault-sql-server"
$db     = "DeckVault"
$app    = "deckvault-api"
$plan   = "deckvault-plan"
$swa    = "deckvault-ui"
$sqlpwd = "YourStr0ngP@ssword!"
```

`$sql` and `$app` must be globally unique across all of Azure — they become part of public DNS names (`deckvault-sql-server.database.windows.net`, `deckvault-api.azurewebsites.net`).

---

### Resource Group

```powershell
az group create --name $rg --location $loc
```

A resource group is a logical container for all resources belonging to one project. Think of it like a namespace or a project folder. You can delete the entire group to tear down everything at once — useful for cleanup or cost control. All resources in the group share the same billing scope and access control.

---

### Azure SQL Server and Database

```powershell
az sql server create `
  --name $sql --resource-group $rg --location $loc `
  --admin-user sqladmin --admin-password $sqlpwd
```

Azure SQL is a managed SQL Server — Microsoft handles patching, backups, and high availability. The "server" is a logical container; the actual database is created separately. This is equivalent to an RDS instance in AWS terms.

**Firewall rules** — Azure SQL denies all inbound connections by default. Two rules are needed:

```powershell
# Allows all Azure services (including App Service) to connect
az sql server firewall-rule create `
  --server $sql --resource-group $rg `
  --name AllowAzureServices `
  --start-ip-address 0.0.0.0 --end-ip-address 0.0.0.0

# Allows your local machine to connect (needed to run EF migrations)
az sql server firewall-rule create `
  --server $sql --resource-group $rg `
  --name LocalDev `
  --start-ip-address (Invoke-RestMethod https://api.ipify.org) `
  --end-ip-address (Invoke-RestMethod https://api.ipify.org)
```

The `0.0.0.0–0.0.0.0` range is Azure's special sentinel value meaning "allow all Azure-internal traffic." It does not open the server to the public internet. `Invoke-RestMethod https://api.ipify.org` is a quick way to get your current public IP without looking it up manually.

**Database creation:**

```powershell
az sql db create `
  --server $sql --resource-group $rg `
  --name $db --service-objective Basic
```

`Basic` is the entry-level tier: 5 DTUs (Database Transaction Units, Azure's compute measure), 2 GB max storage, ~$5/month. More than sufficient for a portfolio app.

---

### Running EF Core Migrations Against Azure SQL

```powershell
$connStr = "Server=tcp:$sql.database.windows.net,1433;Database=$db;User ID=sqladmin;Password=$sqlpwd;Encrypt=True;"
dotnet ef database update --connection $connStr
```

`dotnet ef database update` normally reads the connection string from `appsettings.json`. The `--connection` flag overrides it, pointing at Azure SQL instead of LocalDB. EF applies all pending migrations — the same `Initial` and `AddConstraints` migrations that already ran on LocalDB now run on the production database.

**Important:** The API must not be running locally when you do this — it locks the compiled `.exe` and prevents `dotnet ef` from rebuilding the project.

**Connection string format differences** — LocalDB uses Windows Authentication (`Trusted_Connection=True`). Azure SQL uses SQL authentication (`User ID=...;Password=...`) and requires `Encrypt=True` because the connection goes over the public internet.

---

### App Service Plan and Web App

**App Service Plan** — the underlying compute (think: the server). The plan defines the region, OS, and pricing tier. Multiple web apps can share one plan.

```powershell
az appservice plan create `
  --name $plan --resource-group $rg `
  --sku F1 --location centralus
```

`F1` is the free tier: shared compute, 1 GB RAM, 60 CPU minutes/day, no custom domains. Sufficient for a demo. Note: East US and West US were at VM quota capacity for the free subscription, so Central US was used instead. This is a common limitation of new free Azure accounts — each region has a quota, and popular regions fill up.

**Web App:**

```powershell
az webapp create `
  --name $app --resource-group $rg `
  --plan $plan --runtime "dotnet:10"
```

Creates the actual application host. `--runtime "dotnet:10"` tells App Service which runtime to use — this is a Windows App Service plan, hence `dotnet:10` rather than `DOTNETCORE|10.0` which is the Linux variant.

**Connection string:**

```powershell
az webapp config connection-string set `
  --name $app --resource-group $rg `
  --connection-string-type SQLAzure `
  --settings DefaultConnection="$connStr"
```

App Service connection strings override `appsettings.json` at runtime. This is how the production connection string is kept out of the repository — it lives only in Azure. The CLI output shows `"value": null` for security (Azure masks sensitive values), but the value is stored correctly.

**Why `ConnectionStrings__DefaultConnection` works as an environment variable** — ASP.NET Core's config system maps double underscores to JSON nesting. `ConnectionStrings__DefaultConnection` in an environment variable is equivalent to `{ "ConnectionStrings": { "DefaultConnection": "..." } }` in JSON. Azure App Service exposes app settings and connection strings as environment variables, so they override the file-based config automatically.

---

### Publishing and Deploying the API

```powershell
dotnet publish -c Release -o ./publish
Compress-Archive -Path ./publish/* -DestinationPath ./publish.zip -Force
az webapp deploy --name $app --resource-group $rg --src-path ./publish.zip
```

**`dotnet publish -c Release`** — compiles the app in Release mode (optimizations on, debug symbols off) and outputs a self-contained deployment package to `./publish`. This is what ships to Azure — not the source code, just the compiled binaries and static assets.

**Zip deployment** — Azure App Service's simplest deployment method. The zip is uploaded and extracted into the web root. Other methods include GitHub Actions CI/CD, Azure DevOps pipelines, and FTP — zip deploy is the fastest for a manual one-off.

The API is now live at: `https://deckvault-api.azurewebsites.net`

---

### CORS for Production

The `AllowedOrigins` setting in `appsettings.json` is hardcoded to `localhost:5173` for local development. In Azure, the app settings `AllowedOrigins__0` and `AllowedOrigins__1` override the array values at runtime:

```powershell
az webapp config appsettings set `
  --name $app --resource-group $rg `
  --settings `
    AllowedOrigins__0="http://localhost:5173" `
    AllowedOrigins__1="https://delightful-forest-034db2b10-preview.centralus.7.azurestaticapps.net"
```

`AllowedOrigins__0` maps to index 0 of the JSON array — the double-underscore array index syntax is part of ASP.NET Core's environment variable config convention. This means both local dev and production work without changing any code.

---

### Azure Static Web Apps (React Frontend)

Static Web Apps is Azure's service for hosting static files (HTML, CSS, JS). It is globally distributed via CDN, supports custom domains and HTTPS, and has a permanently free tier.

```powershell
az staticwebapp create `
  --name $swa --resource-group $rg --location centralus

$token = az staticwebapp secrets list `
  --name $swa --resource-group $rg `
  --query "properties.apiKey" -o tsv
```

The deployment token (`apiKey`) authenticates the deployment from your machine. It is equivalent to a deploy key — never commit it to source control.

**Building with the production API URL:**

```powershell
$env:VITE_API_BASE_URL = "https://deckvault-api.azurewebsites.net/api"
npm run build
```

Vite bakes environment variables into the bundle at build time. Setting `VITE_API_BASE_URL` before running `npm run build` means the compiled JavaScript has the Azure URL hardcoded into it. In `api/client.js`, `import.meta.env.VITE_API_BASE_URL` resolves to that value in the production bundle. This is why the variable must be set before the build, not at runtime — unlike a .NET app, a static JS bundle has no server to read environment variables from at request time.

```powershell
npx @azure/static-web-apps-cli deploy ./dist --deployment-token $token
```

The SWA CLI uploads the `dist/` folder (Vite's build output) to Azure's CDN. The npm deprecation warnings printed during this step come from the SWA CLI's own transitive dependencies — they do not affect the deployment.

The frontend is now live at: `https://delightful-forest-034db2b10-preview.centralus.7.azurestaticapps.net`

---

### Key Azure Concepts Summary

| Concept | What it is | Grails/Java analogy |
|---|---|---|
| Resource Group | Logical container for all project resources | A project namespace or folder |
| Azure SQL | Managed SQL Server in the cloud | RDS / Cloud SQL |
| App Service Plan | The compute (server) underlying a web app | A VM or container host |
| App Service Web App | The application running on that compute | A WAR deployed to Tomcat |
| Static Web Apps | CDN-hosted static file serving | Nginx serving a build output folder |
| App Settings | Environment variables injected at runtime | System properties / environment config |
| `dotnet publish` | Compiles + packages the app for deployment | `./gradlew bootJar` |
| Zip deploy | Upload a zip to App Service | Deploying a WAR to a server |

---

## What I'd Add With More Time

(Talking points for the interview)

- **Authentication** — ASP.NET Core Identity or Azure AD B2C
- **Multi-user support** — Add `UserId` to `CollectionEntry` and `Deck`
- **Price sync background job** — Scheduled Azure Function calling Scryfall prices API
- **Application Insights** — Azure's observability platform, one NuGet package to wire in
- **Unit/integration tests** — xUnit + EF Core in-memory provider for controller tests
- **Pagination** — Collection pages can get large; `Skip()`/`Take()` in LINQ
