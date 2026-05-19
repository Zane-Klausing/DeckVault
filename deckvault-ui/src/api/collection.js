import { apiFetch } from './client';

// Fetch all entries in the user's collection.
// Returns an array of CollectionEntryResponse objects (includes card name, set, qty, price, date).
export const getCollection = () =>
  apiFetch('/collection');

// Add a card to the collection.
// data should match AddToCollectionRequest: scryfallId, name, setCode, imageUrl, quantity, purchasePrice, purchaseDate.
// JSON.stringify converts the JS object to a JSON string for the request body.
export const addToCollection = (data) =>
  apiFetch('/collection', {
    method: 'POST',
    body: JSON.stringify(data),
  });

// Remove a collection entry by its ID.
// Returns null (204 No Content) on success.
export const deleteEntry = (id) =>
  apiFetch(`/collection/${id}`, { method: 'DELETE' });
