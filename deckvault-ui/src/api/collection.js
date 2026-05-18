import { apiFetch } from './client';

export const getCollection = () =>
  apiFetch('/collection');

export const addToCollection = (data) =>
  apiFetch('/collection', {
    method: 'POST',
    body: JSON.stringify(data),
  });

export const deleteEntry = (id) =>
  apiFetch(`/collection/${id}`, { method: 'DELETE' });
