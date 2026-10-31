export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string, public details?: Record<string, string[]>) {
    super(message);
  }
}

/** Same-origin calls (Next proxies /api to the backend). CSRF header is required on every write. */
export async function api<T = any>(path: string, init: { method?: string; body?: unknown; headers?: Record<string, string>; raw?: BodyInit } = {}): Promise<T> {
  const method = init.method ?? (init.body !== undefined ? 'POST' : 'GET');
  const headers: Record<string, string> = { 'X-Requested-With': 'affidraw', ...(init.headers ?? {}) };
  let body: BodyInit | undefined = init.raw;
  if (init.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(init.body);
  }
  let res: Response;
  try {
    res = await fetch(`/api${path}`, { method, headers, body, credentials: 'include' });
  } catch {
    throw new ApiError(0, 'NETWORK', 'Network problem. Check your connection and try again.');
  }
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const e = json?.error ?? {};
    throw new ApiError(res.status, e.code ?? 'ERROR', e.message ?? 'Something went wrong. Please try again.', e.details);
  }
  return json as T;
}
