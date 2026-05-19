import { apiFetch } from './client';

// Search Scryfall (via the API) for cards matching the query string.
// encodeURIComponent percent-encodes special characters so they're safe in a URL.
// Returns an array of Scryfall card objects.
export const searchCards = (q) =>
  apiFetch(`/cards/search?q=${encodeURIComponent(q)}`);

// Fetch all cards stored in the local database.
// These are cards the user has already interacted with (added to collection/decks).
// Used on the Decks page to populate the "add card" dropdown.
export const getCards = () =>
  apiFetch('/cards');
