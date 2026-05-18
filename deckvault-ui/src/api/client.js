const BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5002/api';

export async function apiFetch(path, options = {}) {
  const hasBody = options.body != null;
  const res = await fetch(`${BASE}${path}`, {
    headers: hasBody ? { 'Content-Type': 'application/json' } : {},
    ...options,
  });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  if (res.status === 204) return null;
  return res.json();
}
