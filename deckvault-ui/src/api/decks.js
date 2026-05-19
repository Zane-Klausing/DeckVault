import { apiFetch } from './client';

// Fetch the summary list of all decks (no card details).
export const getDecks = () =>
  apiFetch('/decks');

// Fetch a single deck with its full card list.
// Used when the user clicks a deck in the list to show the detail panel.
export const getDeck = (id) =>
  apiFetch(`/decks/${id}`);

// Create a new deck.
// data should match CreateDeckRequest: { name, format }.
export const createDeck = (data) =>
  apiFetch('/decks', {
    method: 'POST',
    body: JSON.stringify(data),
  });

// Add (or update the quantity of) a card in a deck.
// data should match AddCardToDeckRequest: { cardId, quantity }.
export const addCardToDeck = (deckId, data) =>
  apiFetch(`/decks/${deckId}/cards`, {
    method: 'POST',
    body: JSON.stringify(data),
  });

// Delete an entire deck and all its card associations.
export const deleteDeck = (id) =>
  apiFetch(`/decks/${id}`, { method: 'DELETE' });

// Remove a specific card from a deck without deleting the deck or the card itself.
export const removeCardFromDeck = (deckId, cardId) =>
  apiFetch(`/decks/${deckId}/cards/${cardId}`, { method: 'DELETE' });
