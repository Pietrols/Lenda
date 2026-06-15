// Cursor pagination helpers shared by the list endpoints.
//
// Mobile clients page with ?cursor=<id>&limit=<n>. The web app sends neither,
// and to keep its existing "return everything" behaviour we default the limit
// to a high value when no cursor is present. With a cursor, the limit defaults
// to 20 and is capped at 50.

export const MAX_PAGE_LIMIT = 50;
export const CURSOR_DEFAULT_LIMIT = 20;
// Effectively "all" for current data volumes — preserves legacy behaviour for
// callers (the web app) that don't paginate.
export const LEGACY_LIMIT = 1000;

export type PaginationParams = {
  cursor?: string;
  limit: number;
};

export function parsePagination(query: {
  cursor?: unknown;
  limit?: unknown;
}): PaginationParams {
  const cursor =
    typeof query.cursor === "string" && query.cursor.length > 0
      ? query.cursor
      : undefined;

  let limit: number;
  if (query.limit !== undefined) {
    const n = parseInt(String(query.limit), 10);
    limit = Number.isFinite(n)
      ? Math.min(Math.max(n, 1), MAX_PAGE_LIMIT)
      : CURSOR_DEFAULT_LIMIT;
  } else {
    // No explicit limit: paginated callers get the default page size; legacy
    // callers (no cursor) get a high limit so existing behaviour is unchanged.
    limit = cursor ? CURSOR_DEFAULT_LIMIT : LEGACY_LIMIT;
  }

  return { cursor, limit };
}

// Given the rows returned with `take: limit` (ordered, cursor applied), derive
// nextCursor: the id of the last row when the page came back full (so there may
// be more), otherwise null.
export function buildNextCursor<T extends { id: string }>(
  rows: T[],
  limit: number,
): string | null {
  return rows.length === limit && rows.length > 0
    ? rows[rows.length - 1].id
    : null;
}
