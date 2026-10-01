/**
 * The backend's list envelope is NOT verified in the current contract, so this
 * normaliser accepts every plausible shape and yields one canonical form.
 * Once the live API is inspected (`npm run probe:api`), tighten this.
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

function rec(v: unknown): Record<string, unknown> | null {
  return typeof v === "object" && v !== null && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}
function num(v: unknown): number | undefined {
  return typeof v === "number" && Number.isFinite(v) ? v : undefined;
}

/** `body` is the full JSON response body (not unwrapped). */
export function normalizePage<T>(body: unknown, fallback: { page: number; limit: number }): Paginated<T> {
  const root = rec(body);
  const data = root && "data" in root ? root.data : body;
  const dataRec = rec(data);

  let items: T[] = [];
  if (Array.isArray(data)) items = data as T[];
  else if (dataRec) {
    const list = dataRec.items ?? dataRec.results ?? dataRec.data ?? dataRec.rows;
    if (Array.isArray(list)) items = list as T[];
  }

  const metaSource =
    rec(root?.meta) ?? rec(root?.pagination) ?? rec(dataRec?.meta) ?? rec(dataRec?.pagination) ?? {};

  const page = num(metaSource.page) ?? fallback.page;
  const limit = num(metaSource.limit) ?? num(metaSource.pageSize) ?? fallback.limit;
  const total = num(metaSource.total) ?? num(metaSource.totalItems) ?? num(metaSource.count) ?? items.length;
  const totalPages =
    num(metaSource.totalPages) ?? num(metaSource.pages) ?? Math.max(1, Math.ceil(total / Math.max(limit, 1)));

  return { items, meta: { page, limit, total, totalPages } };
}
