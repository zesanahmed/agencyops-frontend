/**
 * List envelope (verified against the backend services):
 *   { success, message, data: { <plural>: [...], pagination: { page, limit, total, totalPages } } }
 * e.g. data.organizations, data.members, data.invitations, data.projects, data.tasks ...
 */
export interface PageMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface Paginated<T> {
  items: T[];
  meta: PageMeta;
}

function rec(v: unknown): Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}
const num = (v: unknown): number | undefined => (typeof v === "number" && Number.isFinite(v) ? v : undefined);

/** `body` is the full JSON response body; `key` is the plural resource key inside `data`. */
export function normalizePage<T>(body: unknown, key: string, fallback: { page: number; limit: number }): Paginated<T> {
  const data = rec(rec(body).data);
  const list = data[key];
  const items = Array.isArray(list) ? (list as T[]) : [];
  const p = rec(data.pagination);

  const page = num(p.page) ?? fallback.page;
  const limit = num(p.limit) ?? fallback.limit;
  const total = num(p.total) ?? items.length;
  const totalPages = Math.max(1, num(p.totalPages) ?? Math.ceil(total / Math.max(limit, 1)));
  return { items, meta: { page, limit, total, totalPages } };
}
