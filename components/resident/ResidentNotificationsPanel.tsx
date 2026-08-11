"use client";

import { useActionState } from "react";
import { CheckCheck, MailOpen } from "lucide-react";
import type { Notification } from "@/types";
import {
  markReadAction,
  markAllReadAction,
  type ResidentNotificationActionState,
} from "@/app/resident/notifications/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { notificationTypeLabel } from "@/lib/admin/format";
import { formatDateTimeMn } from "@/lib/format/datetime";
import { cn } from "@/lib/utils";

const initialState: ResidentNotificationActionState = { status: "idle" };

function typeTone(type: string): "emerald" | "sky" | "amber" | "rose" | "violet" | "zinc" {
  switch (type) {
    case "INVOICE":
      return "amber";
    case "PAYMENT":
      return "emerald";
    case "MAINTENANCE":
      return "sky";
    case "ANNOUNCEMENT":
      return "violet";
    case "GATE":
      return "rose";
    case "SYSTEM":
      return "zinc";
    default:
      return "zinc";
  }
}

export function ResidentNotificationsPanel({
  notifications,
}: {
  notifications: Notification[];
}) {
  const [markState, markAction, markPending] = useActionState(markReadAction, initialState);
  const [allState, markAllAction, markAllPending] = useActionState(
    async () => markAllReadAction(),
    initialState,
  );

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3 flex-wrap">
        <div>
          <CardTitle>Мэдэгдэл</CardTitle>
          <p className="text-sm text-zinc-500 mt-1">
            {unreadCount > 0 ? `${unreadCount} уншаагүй` : "Бүгд уншсан"}
          </p>
        </div>
        {unreadCount > 0 ? (
          <form action={markAllAction}>
            <Button type="submit" variant="outline" size="sm" disabled={markAllPending}>
              <CheckCheck className="size-3.5 mr-1" />
              {markAllPending ? "Тэмдэглэж байна..." : "Бүгдийг уншсан"}
            </Button>
          </form>
        ) : null}
      </CardHeader>
      <CardContent>
        {(markState.message || allState.message) &&
        (markState.status !== "idle" || allState.status !== "idle") ? (
          <p
            className={`text-sm mb-4 ${
              markState.status === "error" || allState.status === "error"
                ? "text-destructive"
                : "text-emerald-600"
            }`}
          >
            {markState.message || allState.message}
          </p>
        ) : null}

        {notifications.length === 0 ? (
          <p className="py-10 text-center text-sm text-zinc-500">Мэдэгдэл байхгүй</p>
        ) : (
          <div className="flex flex-col divide-y divide-zinc-100 dark:divide-zinc-800">
            {notifications.map((notif) => (
              <div
                key={notif.id}
                className={cn(
                  "flex flex-col sm:flex-row sm:items-start gap-3 py-4 first:pt-0 last:pb-0",
                  !notif.is_read && "bg-emerald-50/50 dark:bg-emerald-500/5 -mx-4 px-4 rounded-lg",
                )}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <StatusBadge
                      label={notificationTypeLabel(notif.type)}
                      tone={typeTone(notif.type)}
                    />
                    {!notif.is_read ? (
                      <span className="size-2 rounded-full bg-emerald-500 shrink-0" aria-hidden />
                    ) : null}
                  </div>
                  <div className={cn("font-medium", !notif.is_read && "text-emerald-900 dark:text-emerald-100")}>
                    {notif.title}
                  </div>
                  {notif.message ? (
                    <p className="text-sm text-zinc-500 mt-1">{notif.message}</p>
                  ) : null}
                  <p className="text-xs text-zinc-400 mt-2">
                    {formatDateTimeMn(notif.created_at)}
                  </p>
                </div>
                {!notif.is_read ? (
                  <form action={markAction} className="shrink-0">
                    <input type="hidden" name="id" value={notif.id} />
                    <Button type="submit" variant="outline" size="sm" disabled={markPending}>
                      <MailOpen className="size-3.5 mr-1" />
                      Уншсан
                    </Button>
                  </form>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
