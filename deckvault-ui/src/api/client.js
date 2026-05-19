// Read the API base URL from a Vite environment variable if set (used in production builds).
// ?? falls back to localhost for local development if the variable isn't defined.
// import.meta.env is Vite's equivalent of process.env in Node — variables prefixed
// with VITE_ are baked into the bundle at build time.
const BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5002/api';

// Central fetch wrapper used by all API modules.
// Having one function here means base URL and error handling are defined once —
// individual API files just call apiFetch and never construct raw fetch() calls.
export async function apiFetch(path, options = {}) {
  // Only set Content-Type when there's a request body — GET and DELETE requests
  // don't have bodies and shouldn't claim to be sending JSON
  const hasBody = options.body != null;
  const res = await fetch(`${BASE}${path}`, {
    headers: hasBody ? { 'Content-Type': 'application/json' } : {},
    // Spread the caller's options last so they can override defaults if needed
    ...options,
  });
  // Any non-2xx response is treated as an error — throw so callers can catch it
  if (!res.ok) throw new Error(`API error ${res.status}`);
  // 204 No Content has no body to parse — return null rather than calling res.json()
  // which would throw on an empty response
  if (res.status === 204) return null;
  // Parse and return the JSON response body
  return res.json();
}
