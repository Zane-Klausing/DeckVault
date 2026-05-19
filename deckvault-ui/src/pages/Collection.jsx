// useState — stores values that cause the UI to re-render when they change
// useEffect — runs code after render (on mount, or when dependencies change)
// useCallback — memoizes a function so it doesn't get recreated on every render
import { useState, useEffect, useCallback } from 'react';
import { searchCards } from '../api/cards';
import { getCollection, deleteEntry } from '../api/collection';
import AddToCollectionModal from '../components/AddToCollectionModal';
import './Collection.css';

// Formats a YYYY-MM-DD date string into a readable label like "Jan 5, 2025".
// The 'T00:00:00' suffix forces local time interpretation — without it,
// JavaScript parses bare date strings as UTC midnight, which can shift the
// displayed date back by one day in negative UTC offset timezones.
function formatDate(iso) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

export default function Collection() {
  // State for the search input field
  const [query, setQuery] = useState('');
  // Scryfall search results — array of card objects from the API
  const [searchResults, setSearchResults] = useState([]);
  // The user's saved collection — array of CollectionEntryResponse objects
  const [collection, setCollection] = useState([]);
  // When non-null, holds the card being added — this opens the modal
  const [addingCard, setAddingCard] = useState(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');

  // useCallback memoizes this function so it has a stable reference across renders.
  // Without it, including loadCollection in a useEffect dependency array would
  // create an infinite loop (new function → effect runs → new function → ...).
  const loadCollection = useCallback(async () => {
    try {
      const data = await getCollection();
      setCollection(data);
    } catch {
      console.error('Failed to load collection');
    }
  }, []); // empty array — this function never needs to be recreated

  // Load the collection once when the component first mounts.
  // The dependency [loadCollection] is stable due to useCallback above.
  useEffect(() => { loadCollection(); }, [loadCollection]);

  async function handleSearch(e) {
    e.preventDefault();  // prevent browser form submission / page reload
    if (!query.trim()) return;
    setSearching(true);
    setSearchError('');
    setSearchResults([]);
    try {
      const results = await searchCards(query.trim());
      setSearchResults(results);
      if (results.length === 0) setSearchError('No cards found.');
    } catch {
      // Show a friendly message rather than exposing a raw error to the user
      setSearchError('Search is unavailable right now. Please try again.');
    } finally {
      // finally runs whether the try succeeded or threw — always clear the loading state
      setSearching(false);
    }
  }

  async function handleDelete(id) {
    try {
      await deleteEntry(id);
      // Update state directly instead of re-fetching — removes the deleted entry
      // from the array without a network round-trip
      setCollection((prev) => prev.filter((e) => e.id !== id));
    } catch {
      alert('Failed to delete entry.');
    }
  }

  return (
    <div className="collection-page">
      <h2>Collection</h2>

      {/* sr-only hides the label visually but keeps it accessible to screen readers */}
      <form className="search-bar" onSubmit={handleSearch}>
        <label htmlFor="card-search" className="sr-only">Search for cards</label>
        <input
          id="card-search"
          value={query}
          // onChange fires on every keystroke and updates the query state (controlled input)
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search Scryfall (e.g. lightning bolt)"
        />
        <button type="submit" className="primary" disabled={searching}>
          {/* Ternary renders different text based on the searching state */}
          {searching ? 'Searching…' : 'Search'}
        </button>
      </form>

      {/* Only render the results section if there's something to show */}
      {(searchResults.length > 0 || searchError) && (
        <div className="search-results">
          {/* role="status" + aria-live="polite" announces result counts to screen readers
              without interrupting whatever they were reading */}
          <div
            className="search-status"
            role="status"
            aria-live="polite"
            aria-atomic="true"  // reads the whole content, not just the changed part
          >
            {searchError || (searchResults.length > 0 ? `${searchResults.length} results` : '')}
          </div>
          <div className="card-grid">
            {/* .map() renders one <div> per card — React's equivalent of a <g:each> loop */}
            {searchResults.map((card) => (
              // key tells React which item is which when the list updates —
              // must be unique and stable (Scryfall id works perfectly)
              <div key={card.id} className="card-tile">
                {/* Optional chaining ?. safely accesses imageUris even if it's undefined */}
                {card.imageUris?.normal
                  ? <img src={card.imageUris.normal} alt={card.name} />
                  : <div style={{ height: 120, background: 'var(--border)' }} />}
                <div className="card-tile-info">
                  <span>{card.name}</span>
                  <small>{card.set.toUpperCase()}</small>
                </div>
                {/* aria-label gives each button a unique accessible name since they
                    all say "+ Add" visually — screen readers read the full label */}
                <button
                  className="primary"
                  onClick={() => setAddingCard(card)}  // sets addingCard → opens modal
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
        {/* Conditional rendering — show empty state or table depending on data */}
        {collection.length === 0
          ? <p className="empty-state">No cards yet. Search above to add some.</p>
          : (
            <table>
              {/* caption is announced by screen readers when they enter the table */}
              <caption className="sr-only">Your card collection</caption>
              <thead>
                <tr>
                  {/* scope="col" associates each header with its column for screen readers */}
                  <th scope="col">Card</th>
                  <th scope="col">Set</th>
                  <th scope="col">Qty</th>
                  <th scope="col">Purchase Price</th>
                  <th scope="col">Purchase Date</th>
                  {/* sr-only gives the actions column a label without visible text */}
                  <th scope="col"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {collection.map((entry) => (
                  <tr key={entry.id}>
                    <td>{entry.cardName}</td>
                    <td>{entry.setCode.toUpperCase()}</td>
                    <td>{entry.quantity}</td>
                    {/* ?? 0 guards against null purchasePrice; toFixed(2) formats as currency */}
                    <td>${(entry.purchasePrice ?? 0).toFixed(2)}</td>
                    <td>{formatDate(entry.purchaseDate)}</td>
                    <td>
                      {/* Confirm dialog prevents accidental deletion */}
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

      {/* addingCard being non-null controls whether the modal renders.
          onClose clears addingCard (closes modal); onAdded refreshes the collection. */}
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
