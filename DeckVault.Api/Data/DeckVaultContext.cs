using DeckVault.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace DeckVault.Api.Data;

// DbContext is EF Core's gateway to the database — it tracks entity changes,
// generates SQL, and manages the connection. This class inherits from DbContext
// and is registered in Program.cs so ASP.NET can inject it into controllers.
// Primary constructor passes the options (connection string, provider) up to DbContext.
public class DeckVaultContext(DbContextOptions<DeckVaultContext> options) : DbContext(options)
{
    // DbSet<T> represents a database table and is the entry point for LINQ queries.
    // => Set<T>() is a shorthand property body that delegates to the DbContext base method.
    public DbSet<Card> Cards => Set<Card>();
    public DbSet<CollectionEntry> CollectionEntries => Set<CollectionEntry>();
    public DbSet<Deck> Decks => Set<Deck>();
    public DbSet<DeckCard> DeckCards => Set<DeckCard>();

    // OnModelCreating is called once when EF Core builds its internal model of the schema.
    // Use it to configure anything that can't be expressed with data annotations on the models.
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // DeckCard is a join table (many-to-many between Deck and Card).
        // It has no single-column primary key — the composite of DeckId + CardId is unique
        // and serves as the primary key instead.
        modelBuilder.Entity<DeckCard>()
            .HasKey(dc => new { dc.DeckId, dc.CardId });

        // decimal defaults to decimal(18,2) in SQL Server — being explicit here documents
        // the precision and scale in code and prevents surprises if the default changes
        modelBuilder.Entity<CollectionEntry>()
            .Property(ce => ce.PurchasePrice)
            .HasColumnType("decimal(10,2)");

        modelBuilder.Entity<Card>(entity =>
        {
            // Unique index prevents two Card rows with the same ScryfallId —
            // guards against race conditions where the same card is added twice simultaneously
            entity.HasIndex(c => c.ScryfallId).IsUnique();

            // MaxLength generates bounded nvarchar(N) columns instead of nvarchar(max).
            // Bounded columns are indexable and use less storage.
            entity.Property(c => c.ScryfallId).HasMaxLength(36);  // Scryfall UUIDs are 36 chars
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
