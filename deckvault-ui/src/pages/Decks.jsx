import { useState, useEffect, useCallback } from 'react';
import { getDecks, getDeck, createDeck, addCardToDeck, deleteDeck, removeCardFromDeck } from '../api/decks';
import { getCards } from '../api/cards';
import './Decks.css';

function formatDate(iso) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

export default function Decks() {
  const [decks, setDecks] = useState([]);
  const [selectedDeck, setSelectedDeck] = useState(null);
  const [collectionCards, setCollectionCards] = useState([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newFormat, setNewFormat] = useState('');
  const [addCardId, setAddCardId] = useState('');
  const [addQty, setAddQty] = useState(1);

  const loadDecks = useCallback(async () => {
    try { setDecks(await getDecks()); } catch { console.error('Failed to load decks'); }
  }, []);

  useEffect(() => {
    loadDecks();
    getCards().then(setCollectionCards).catch(console.error);
  }, [loadDecks]);

  // Fix B: set addCardId default once collectionCards loads
  useEffect(() => {
    if (collectionCards.length > 0 && !addCardId) {
      setAddCardId(String(collectionCards[0].id));
    }
  }, [collectionCards, addCardId]);

  async function handleSelectDeck(deck) {
    try {
      const detail = await getDeck(deck.id);
      setSelectedDeck(detail);
      if (detail.cards.length > 0) setAddCardId(String(detail.cards[0].cardId));
      else if (collectionCards.length > 0) setAddCardId(String(collectionCards[0].id));
    } catch { console.error('Failed to load deck'); }
  }

  async function handleCreateDeck(e) {
    e.preventDefault();
    try {
      await createDeck({ name: newName, format: newFormat || null });
      setNewName(''); setNewFormat(''); setShowCreateForm(false);
      loadDecks();
    } catch { alert('Failed to create deck.'); }
  }

  // Fix B: guard against empty addCardId or quantity less than 1
  async function handleDeleteDeck(deck) {
    if (!window.confirm(`Delete "${deck.name}"? This cannot be undone.`)) return;
    try {
      await deleteDeck(deck.id);
      if (selectedDeck?.id === deck.id) setSelectedDeck(null);
      loadDecks();
    } catch { alert('Failed to delete deck.'); }
  }

  async function handleRemoveCard(cardId) {
    if (!selectedDeck) return;
    try {
      await removeCardFromDeck(selectedDeck.id, cardId);
      const updated = await getDeck(selectedDeck.id);
      setSelectedDeck(updated);
    } catch { alert('Failed to remove card from deck.'); }
  }

  async function handleAddCard(e) {
    e.preventDefault();
    if (!selectedDeck || !addCardId || Number(addQty) < 1) return;
    try {
      await addCardToDeck(selectedDeck.id, { cardId: Number(addCardId), quantity: Number(addQty) });
      const updated = await getDeck(selectedDeck.id);
      setSelectedDeck(updated);
    } catch { alert('Failed to add card to deck.'); }
  }

  return (
    <div className="decks-page">
      <h2>Decks</h2>
      <div className="decks-layout">

        <div className="deck-list-panel">
          <h3>My Decks</h3>
          <ul className="deck-list">
            {decks.map((d) => (
              <li key={d.id} className="deck-list-row">
                <button
                  className={`deck-list-item${selectedDeck?.id === d.id ? ' active' : ''}`}
                  onClick={() => handleSelectDeck(d)}
                  aria-pressed={selectedDeck?.id === d.id}
                >
                  {d.name}
                  {d.format && <small>{d.format}</small>}
                </button>
                <button
                  className="deck-delete-btn"
                  onClick={() => handleDeleteDeck(d)}
                  aria-label={`Delete ${d.name}`}
                >
                  ×
                </button>
              </li>
            ))}
            {decks.length === 0 && <li className="empty-state">No decks yet.</li>}
          </ul>

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
          {selectedDeck ? (
            <>
              <div className="deck-detail-header">
                <div>
                  <h3>{selectedDeck.name}</h3>
                  {/* Fix E: formatted date display, Fix E: friendlier format fallback */}
                  <small>{selectedDeck.format ?? 'Casual / No format'} · Created {formatDate(selectedDeck.createdDate)}</small>
                </div>
              </div>

              {selectedDeck.cards.length === 0
                ? <p className="empty-state">No cards in this deck. Add some below.</p>
                : (
                  <div className="deck-cards-grid">
                    {/* Fix D: composite key to avoid collisions when same card appears twice */}
                    {selectedDeck.cards.map((dc, idx) => (
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

              {collectionCards.length > 0 && (
                <form className="add-card-form" onSubmit={handleAddCard}>
                  {/* Fix F: aria-label on select */}
                  <select
                    id="deck-card-select"
                    aria-label="Card to add"
                    value={addCardId}
                    onChange={(e) => setAddCardId(e.target.value)}
                  >
                    {collectionCards.map((c) => (
                      <option key={c.id} value={c.id}>{c.name} ({c.setCode.toUpperCase()})</option>
                    ))}
                  </select>
                  {/* Fix C: store addQty as number; Fix F: aria-label on input */}
                  <input
                    id="deck-card-qty"
                    aria-label="Quantity"
                    type="number"
                    min="1"
                    value={addQty}
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
