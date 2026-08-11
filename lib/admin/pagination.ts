export const PAGE_SIZE_OPTIONS = [5, 10, 20] as const;

export type PageSize = (typeof PAGE_SIZE_OPTIONS)[number];

export const DEFAULT_PAGE_SIZE: PageSize = 10;

export function parseTablePagination(params: {
  page?: string;
  limit?: string;
}): { page: number; limit: PageSize; offset: number } {
  const rawLimit = Number(params.limit ?? DEFAULT_PAGE_SIZE);
  const limit = PAGE_SIZE_OPTIONS.includes(rawLimit as PageSize)
    ? (rawLimit as PageSize)
    : DEFAULT_PAGE_SIZE;
  const page = Math.max(1, Number(params.page ?? 1) || 1);
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

export function paginationRange(
  total: number,
  page: number,
  limit: number,
): { from: number; to: number; totalPages: number } {
  if (total === 0) return { from: 0, to: 0, totalPages: 1 };
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const safePage = Math.min(page, totalPages);
  const from = (safePage - 1) * limit + 1;
  const to = Math.min(safePage * limit, total);
  return { from, to, totalPages };
}
