const prefix = "/api/v1";

export async function apiGet<T>(path: string): Promise<T> {
  const r = await fetch(`${prefix}${path}`);
  if (!r.ok) throw new Error(await r.text());
  return r.json() as Promise<T>;
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const r = await fetch(`${prefix}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json() as Promise<T>;
}

export async function apiPut<T>(path: string, body: unknown): Promise<T> {
  const r = await fetch(`${prefix}${path}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json() as Promise<T>;
}

export async function apiPostFile(path: string, file: File): Promise<Response> {
  const fd = new FormData();
  fd.append("file", file);
  return fetch(`${prefix}${path}`, { method: "POST", body: fd });
}
