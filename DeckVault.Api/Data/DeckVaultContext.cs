using DeckVault.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace DeckVault.Api.Data;

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
