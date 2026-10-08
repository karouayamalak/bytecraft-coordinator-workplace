// Central API client for ByteCraft Platform
// In production (Vercel): same domain, use relative /api path
// In development: VITE_API_URL points to localhost:5000
const BASE_URL = import.meta.env.VITE_API_URL || '/api';

let _token: string | null = null;
let _demoUserId: string | null = null;

export function setAuthToken(token: string) { _token = token; }
export function setDemoUserId(id: string | null) { _demoUserId = id; }
export function clearAuth() { _token = null; _demoUserId = null; }

async function request<T>(
  method: string,
  path: string,
  body?: unknown
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (_token) {
    headers['Authorization'] = `Bearer ${_token}`;
  }

  if (_demoUserId) {
    headers['x-demo-user-id'] = _demoUserId;
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    let errMsg = `Request failed (${response.status})`;
    try {
      const err = await response.json();
      errMsg = err.message || errMsg;
    } catch {
      // ignore
    }
    throw new Error(errMsg);
  }

  return response.json();
}

const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, body),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, body),
  delete: <T>(path: string) => request<T>('DELETE', path),
};

export default api;
