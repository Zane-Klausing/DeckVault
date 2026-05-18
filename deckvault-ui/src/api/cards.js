import { apiFetch } from './client';

export const searchCards = (q) =>
  apiFetch(`/cards/search?q=${encodeURIComponent(q)}`);

export const getCards = () =>
  apiFetch('/cards');
