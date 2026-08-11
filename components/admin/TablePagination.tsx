"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  PAGE_SIZE_OPTIONS,
  paginationRange,
  type PageSize,
} from "@/lib/admin/pagination";
import { cn } from "@/lib/utils";

export function TablePagination({
  total,
  page,
  limit,
  className,
}: {
  total: number;
  page: number;
  limit: number;
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { from, to, totalPages } = paginationRange(total, page, limit);
  const safePage = Math.min(page, totalPages);

  function navigate(next: { page?: number; limit?: PageSize }) {
    const params = new URLSearchParams(searchParams.toString());
    if (next.limit !== undefined) {
      params.set("limit", String(next.limit));
      params.set("page", "1");
    }
    if (next.page !== undefined) {
      params.set("page", String(next.page));
    }
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-3 border-t border-border px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4",
        className,
      )}
    >
      <p className="text-sm text-muted-foreground tabular-nums">
        {total === 0 ? (
          "Бичлэг байхгүй"
        ) : (
          <>
            {from}–{to} / {total} · Хуудас {safePage}/{totalPages}
          </>
        )}
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="hidden sm:inline">Мөр</span>
          <select
            value={limit}
            onChange={(e) => navigate({ limit: Number(e.target.value) as PageSize })}
            className="h-8 rounded-lg border border-border bg-background px-2 text-sm"
          >
            {PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>

        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={safePage <= 1}
          onClick={() => navigate({ page: safePage - 1 })}
        >
          <ChevronLeft className="size-4" />
          Өмнөх
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={safePage >= totalPages}
          onClick={() => navigate({ page: safePage + 1 })}
        >
          Дараах
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}

/** Hidden fields to keep pagination when submitting filter forms. */
export function PaginationFormFields({
  page,
  limit,
}: {
  page: number;
  limit: number;
}) {
  return (
    <>
      <input type="hidden" name="page" value="1" />
      <input type="hidden" name="limit" value={limit} />
    </>
  );
}
