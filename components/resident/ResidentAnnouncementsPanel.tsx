"use client";

import { Pin } from "lucide-react";
import type { Announcement } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateMn } from "@/lib/format/datetime";
import { cn } from "@/lib/utils";

export function ResidentAnnouncementsPanel({
  announcements,
}: {
  announcements: Announcement[];
}) {
  if (announcements.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-zinc-500">
          Одоогоор зарлал байхгүй байна
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {announcements.map((item) => (
        <Card
          key={item.id}
          className={cn(
            item.is_pinned && "ring-2 ring-emerald-200 dark:ring-emerald-500/30",
          )}
        >
          <CardHeader className="pb-2">
            <div className="flex items-start gap-2">
              {item.is_pinned ? (
                <Pin className="size-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              ) : null}
              <CardTitle className="text-base leading-snug">{item.title}</CardTitle>
            </div>
            <p className="text-xs text-zinc-500 mt-1">
              {item.published_at ? formatDateMn(item.published_at) : "—"}
            </p>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {item.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.image_url}
                alt=""
                className="w-full rounded-lg object-cover max-h-40"
              />
            ) : null}
            <p className="text-sm text-zinc-600 dark:text-zinc-400 whitespace-pre-wrap line-clamp-6">
              {item.content}
            </p>
            {item.attachment_url ? (
              <a
                href={item.attachment_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline"
              >
                Хавсралт татах
              </a>
            ) : null}
            {item.expires_at ? (
              <p className="text-[10px] text-zinc-400">
                Хүчинтэй хүртэл: {formatDateMn(item.expires_at)}
              </p>
            ) : null}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
