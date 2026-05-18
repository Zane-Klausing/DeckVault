import { useState, useEffect, useCallback } from 'react';
import { searchCards } from '../api/cards';
import { getCollection, deleteEntry } from '../api/collection';
import AddToCollectionModal from '../components/AddToCollectionModal';
import './Collection.css';

function formatDate(iso) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

export default function Collection() {
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [collection, setCollection] = useState([]);
  const [addingCard, setAddingCard] = useState(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');

  const loadCollection = useCallback(async () => {
    try {
      const data = await getCollection();
      setCollection(data);
    } catch {
      console.error('Failed to load collection');
    }
  }, []);

  useEffect(() => { loadCollection(); }, [loadCollection]);

  async function handleSearch(e) {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    setSearchError('');
    setSearchResults([]);
    try {
      const results = await searchCards(query.trim());
      setSearchResults(results);
      if (results.length === 0) setSearchError('No cards found.');
    } catch {
      /* Fix F: user-friendly error — no developer jargon */
      setSearchError('Search is unavailable right now. Please try again.');
    } finally {
      setSearching(false);
    }
  }

  async function handleDelete(id) {
    try {
      await deleteEntry(id);
      setCollection((prev) => prev.filter((e) => e.id !== id));
    } catch {
      alert('Failed to delete entry.');
    }
  }

  return (
    <div className="collection-page">
      <h2>Collection</h2>

      {/* Fix A: explicit <label> linked via htmlFor; visually hidden with .sr-only */}
      <form className="search-bar" onSubmit={handleSearch}>
        <label htmlFor="card-search" className="sr-only">Search for cards</label>
        <input
          id="card-search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search Scryfall (e.g. lightning bolt)"
        />
        <button type="submit" className="primary" disabled={searching}>
          {searching ? 'Searching…' : 'Search'}
        </button>
      </form>

      {(searchResults.length > 0 || searchError) && (
        <div className="search-results">
          {/* Fix B: live region replaces the <h3> heading — status updates are
              not semantic headings and must be announced to screen readers
              without requiring focus */}
          <div
            className="search-status"
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
            {searchError || (searchResults.length > 0 ? `${searchResults.length} results` : '')}
          </div>
          <div className="card-grid">
            {searchResults.map((card) => (
              <div key={card.id} className="card-tile">
                {card.imageUris?.normal
                  ? <img src={card.imageUris.normal} alt={card.name} />
                  : <div style={{ height: 120, background: 'var(--border)' }} />}
                <div className="card-tile-info">
                  <span>{card.name}</span>
                  <small>{card.set.toUpperCase()}</small>
                </div>
                {/* Fix C: unique accessible name per button so screen readers
                    can distinguish between multiple "Add" buttons on the page */}
                <button
                  className="primary"
                  onClick={() => setAddingCard(card)}
                  aria-label={`Add ${card.name} to collection`}
                >
                  + Add
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="collection-section">
        <h3>My Collection ({collection.length} entries)</h3>
        {collection.length === 0
          ? <p className="empty-state">No cards yet. Search above to add some.</p>
          : (
            <table>
              {/* Fix D: caption gives screen readers context for the table */}
              <caption className="sr-only">Your card collection</caption>
              <thead>
                <tr>
                  {/* Fix D: scope="col" on every header; Actions column gets a
                      visually hidden label so the empty <th> is not announced
                      as blank by screen readers */}
                  <th scope="col">Card</th>
                  <th scope="col">Set</th>
                  <th scope="col">Qty</th>
                  <th scope="col">Purchase Price</th>
                  <th scope="col">Purchase Date</th>
                  <th scope="col"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {collection.map((entry) => (
                  <tr key={entry.id}>
                    <td>{entry.cardName}</td>
                    <td>{entry.setCode.toUpperCase()}</td>
                    <td>{entry.quantity}</td>
                    <td>${(entry.purchasePrice ?? 0).toFixed(2)}</td>
                    <td>{formatDate(entry.purchaseDate)}</td>
                    <td>
                      {/* Fix E: confirmation gate prevents accidental data loss */}
                      <button
                        className="danger"
                        onClick={() => {
                          if (window.confirm(`Remove ${entry.cardName} from your collection?`)) {
                            handleDelete(entry.id);
                          }
                        }}
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
      </div>

      {addingCard && (
        <AddToCollectionModal
          card={addingCard}
          onClose={() => setAddingCard(null)}
          onAdded={loadCollection}
        />
      )}
    </div>
  );
}
