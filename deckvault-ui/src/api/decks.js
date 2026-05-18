import { apiFetch } from './client';

export const getDecks = () =>
  apiFetch('/decks');

export const getDeck = (id) =>
  apiFetch(`/decks/${id}`);

export const createDeck = (data) =>
  apiFetch('/decks', {
    method: 'POST',
    body: JSON.stringify(data),
  });

export const addCardToDeck = (deckId, data) =>
  apiFetch(`/decks/${deckId}/cards`, {
    method: 'POST',
    body: JSON.stringify(data),
  });

export const deleteDeck = (id) =>
  apiFetch(`/decks/${id}`, { method: 'DELETE' });

export const removeCardFromDeck = (deckId, cardId) =>
  apiFetch(`/decks/${deckId}/cards/${cardId}`, { method: 'DELETE' });
