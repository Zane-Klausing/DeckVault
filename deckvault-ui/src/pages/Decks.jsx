import { useState, useEffect, useCallback } from 'react';
import { getDecks, getDeck, createDeck, addCardToDeck, deleteDeck, removeCardFromDeck } from '../api/decks';
import { getCards } from '../api/cards';
import './Decks.css';

// Formats a YYYY-MM-DD string to a readable date label.
// 'T00:00:00' forces local time to prevent off-by-one-day in negative UTC offset timezones.
function formatDate(iso) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

export default function Decks() {
  const [decks, setDecks] = useState([]);                // summary list from GET /api/decks
  const [selectedDeck, setSelectedDeck] = useState(null); // full deck detail (with cards)
  const [collectionCards, setCollectionCards] = useState([]); // local DB cards for the add-card dropdown
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newFormat, setNewFormat] = useState('');
  const [addCardId, setAddCardId] = useState('');  // selected card in the add-card dropdown
  const [addQty, setAddQty] = useState(1);

  // useCallback gives loadDecks a stable reference so it can be in a useEffect dependency array
  const loadDecks = useCallback(async () => {
    try { setDecks(await getDecks()); } catch { console.error('Failed to load decks'); }
  }, []);

  // Load decks and the collection card list on first render
  useEffect(() => {
    loadDecks();
    // Load cards from the local DB for the "add card to deck" dropdown
    getCards().then(setCollectionCards).catch(console.error);
  }, [loadDecks]);

  // Once collectionCards loads, default the dropdown to the first card.
  // Runs when collectionCards changes — guards with !addCardId to avoid overriding
  // a selection the user already made.
  useEffect(() => {
    if (collectionCards.length > 0 && !addCardId) {
      setAddCardId(String(collectionCards[0].id));
    }
  }, [collectionCards, addCardId]);

  // Fetch full deck detail (with cards) when the user clicks a deck in the list
  async function handleSelectDeck(deck) {
    try {
      const detail = await getDeck(deck.id);
      setSelectedDeck(detail);
      // Default the add-card dropdown to the first card in the deck (if any)
      if (detail.cards.length > 0) setAddCardId(String(detail.cards[0].cardId));
      else if (collectionCards.length > 0) setAddCardId(String(collectionCards[0].id));
    } catch { console.error('Failed to load deck'); }
  }

  async function handleCreateDeck(e) {
    e.preventDefault();
    try {
      // Pass null for format if the user left it blank — the API accepts null
      await createDeck({ name: newName, format: newFormat || null });
      setNewName(''); setNewFormat(''); setShowCreateForm(false);
      loadDecks();  // refresh the deck list to show the new deck
    } catch { alert('Failed to create deck.'); }
  }

  async function handleDeleteDeck(deck) {
    // Confirmation gate — prevents accidental deletion of the whole deck
    if (!window.confirm(`Delete "${deck.name}"? This cannot be undone.`)) return;
    try {
      await deleteDeck(deck.id);
      // If the deleted deck was selected, clear the detail panel
      if (selectedDeck?.id === deck.id) setSelectedDeck(null);
      loadDecks();  // refresh the list
    } catch { alert('Failed to delete deck.'); }
  }

  async function handleRemoveCard(cardId) {
    if (!selectedDeck) return;
    try {
      await removeCardFromDeck(selectedDeck.id, cardId);
      // Re-fetch the deck detail to get the updated card list
      const updated = await getDeck(selectedDeck.id);
      setSelectedDeck(updated);
    } catch { alert('Failed to remove card from deck.'); }
  }

  async function handleAddCard(e) {
    e.preventDefault();
    // Guard: don't submit if the deck or card selection is invalid
    if (!selectedDeck || !addCardId || Number(addQty) < 1) return;
    try {
      await addCardToDeck(selectedDeck.id, { cardId: Number(addCardId), quantity: Number(addQty) });
      // Re-fetch to show the updated card list including the newly added card
      const updated = await getDeck(selectedDeck.id);
      setSelectedDeck(updated);
    } catch { alert('Failed to add card to deck.'); }
  }

  return (
    <div className="decks-page">
      <h2>Decks</h2>
      {/* Two-column layout: deck list on the left, deck detail on the right */}
      <div className="decks-layout">

        <div className="deck-list-panel">
          <h3>My Decks</h3>
          <ul className="deck-list">
            {decks.map((d) => (
              <li key={d.id} className="deck-list-row">
                {/* The deck name button selects the deck; active class highlights the current selection */}
                <button
                  className={`deck-list-item${selectedDeck?.id === d.id ? ' active' : ''}`}
                  onClick={() => handleSelectDeck(d)}
                  aria-pressed={selectedDeck?.id === d.id}  // communicates toggle state to screen readers
                >
                  {d.name}
                  {/* Only render the format label if the deck has one */}
                  {d.format && <small>{d.format}</small>}
                </button>
                {/* Separate delete button per deck row */}
                <button
                  className="deck-delete-btn"
                  onClick={() => handleDeleteDeck(d)}
                  aria-label={`Delete ${d.name}`}  // unique accessible name per button
                >
                  ×
                </button>
              </li>
            ))}
            {decks.length === 0 && <li className="empty-state">No decks yet.</li>}
          </ul>

          {/* Toggle between create form and the "+ New Deck" button */}
          {showCreateForm ? (
            <form className="create-form" onSubmit={handleCreateDeck}>
              <input
                placeholder="Deck name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                required
              />
              <input
                placeholder="Format (optional)"
                value={newFormat}
                onChange={(e) => setNewFormat(e.target.value)}
              />
              <div className="create-form-actions">
                <button type="submit" className="primary">Create</button>
                <button type="button" onClick={() => setShowCreateForm(false)}>Cancel</button>
              </div>
            </form>
          ) : (
            <button className="primary" onClick={() => setShowCreateForm(true)} style={{ width: '100%' }}>
              + New Deck
            </button>
          )}
        </div>

        <div className="deck-detail-panel">
          {/* Only render deck detail when a deck is selected */}
          {selectedDeck ? (
            <>
              {/* React Fragments (<> </>) group elements without adding a DOM node */}
              <div className="deck-detail-header">
                <div>
                  <h3>{selectedDeck.name}</h3>
                  {/* ?? provides a fallback for decks created without a format */}
                  <small>{selectedDeck.format ?? 'Casual / No format'} · Created {formatDate(selectedDeck.createdDate)}</small>
                </div>
              </div>

              {selectedDeck.cards.length === 0
                ? <p className="empty-state">No cards in this deck. Add some below.</p>
                : (
                  <div className="deck-cards-grid">
                    {selectedDeck.cards.map((dc, idx) => (
                      // Composite key using cardId + index avoids collisions if the same
                      // card somehow appears in multiple positions
                      <div key={`${dc.cardId}-${idx}`} className="deck-card-tile">
                        {dc.imageUrl
                          ? <img src={dc.imageUrl} alt={dc.cardName} />
                          : <div style={{ height: 100, background: 'var(--border)', borderRadius: 4 }} />}
                        <p>{dc.cardName}</p>
                        <small>×{dc.quantity}</small>
                        <button
                          className="deck-card-remove"
                          onClick={() => handleRemoveCard(dc.cardId)}
                          aria-label={`Remove ${dc.cardName} from deck`}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}

              {/* Only show the add-card form if the user has cards in their collection */}
              {collectionCards.length > 0 && (
                <form className="add-card-form" onSubmit={handleAddCard}>
                  <select
                    id="deck-card-select"
                    aria-label="Card to add"
                    value={addCardId}
                    onChange={(e) => setAddCardId(e.target.value)}
                  >
                    {/* Render one <option> per card in the collection */}
                    {collectionCards.map((c) => (
                      <option key={c.id} value={c.id}>{c.name} ({c.setCode.toUpperCase()})</option>
                    ))}
                  </select>
                  <input
                    id="deck-card-qty"
                    aria-label="Quantity"
                    type="number"
                    min="1"
                    value={addQty}
                    // Number() converts the string value from the input to a number
                    onChange={(e) => setAddQty(Number(e.target.value))}
                  />
                  <button type="submit" className="primary">Add Card</button>
                </form>
              )}
            </>
          ) : (
            <p className="empty-state">Select a deck to view its cards.</p>
          )}
        </div>
      </div>
    </div>
  );
}
