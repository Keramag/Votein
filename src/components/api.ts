/** Small fetch wrapper for the JSON API; throws Error(message) on non-2xx. */
export async function api<T = unknown>(url: string, method: string, body?: unknown, keepalive = false): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: body === undefined ? undefined : { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    keepalive,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? `Request failed (${res.status})`);
  return data as T;
}
