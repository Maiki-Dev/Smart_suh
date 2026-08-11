"use client";

import { useActionState, useState } from "react";
import { MessageSquare, XCircle } from "lucide-react";
import type { MaintenanceRequest, MaintenanceComment } from "@/types";
import {
  createMaintenanceRequestAction,
  addCommentAction,
  closeMaintenanceAction,
  type ResidentMaintenanceActionState,
} from "@/app/resident/maintenance/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { erpSelectClassName } from "@/components/ui/erp-dialog";
import { useActionToast } from "@/lib/hooks/use-action-toast";
import { StatusBadge } from "@/components/admin/StatusBadge";
import {
  maintenanceCategoryLabel,
  maintenancePriorityLabel,
  maintenanceStatusLabel,
  MAINTENANCE_CATEGORY_OPTIONS,
  MAINTENANCE_PRIORITY_OPTIONS,
} from "@/lib/admin/format";
import { cn } from "@/lib/utils";
import { formatDateTimeMn } from "@/lib/format/datetime";

const initialState: ResidentMaintenanceActionState = { status: "idle" };

function statusTone(status: string): "emerald" | "amber" | "rose" | "sky" | "zinc" {
  switch (status) {
    case "OPEN":
      return "sky";
    case "IN_PROGRESS":
      return "amber";
    case "COMPLETED":
      return "emerald";
    case "CANCELLED":
      return "rose";
    case "ON_HOLD":
      return "zinc";
    default:
      return "zinc";
  }
}

function priorityTone(priority: string): "emerald" | "amber" | "rose" | "zinc" {
  switch (priority) {
    case "CRITICAL":
      return "rose";
    case "HIGH":
      return "amber";
    case "MEDIUM":
      return "zinc";
    case "LOW":
      return "emerald";
    default:
      return "zinc";
  }
}

export function ResidentMaintenancePanel({
  requests,
  commentsByRequest,
  hasApartment,
}: {
  requests: MaintenanceRequest[];
  commentsByRequest: Record<string, MaintenanceComment[]>;
  hasApartment: boolean;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [createState, createAction, createPending] = useActionState(createMaintenanceRequestAction, initialState);
  const [commentState, commentAction, commentPending] = useActionState(addCommentAction, initialState);
  const [closeState, closeAction, closePending] = useActionState(closeMaintenanceAction, initialState);

  useActionToast(createState, { successMessage: "Засварын хүсэлт илгээгдлээ" });
  useActionToast(commentState, { successMessage: "Сэтгэгдэл нэмэгдлээ" });
  useActionToast(closeState, { successMessage: "Хүсэлт хаагдлаа" });

  if (!hasApartment) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-zinc-500">
          Орон сууц холбогдоогүй байна. СӨХ-ын админтай холбогдоно уу.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle>Шинэ хүсэлт</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createAction} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="title">Гарчиг</Label>
              <Input id="title" name="title" required placeholder="Ус алдаж байна" />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="description">Тайлбар</Label>
              <textarea
                id="description"
                name="description"
                rows={4}
                placeholder="Асуудлын дэлгэрэнгүй..."
                className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950 resize-none"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="category">Ангилал</Label>
              <select
                id="category"
                name="category"
                defaultValue="OTHER"
                className={erpSelectClassName}
              >
                {MAINTENANCE_CATEGORY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {maintenanceCategoryLabel(opt.value)}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="priority">Чухал байдал</Label>
              <select
                id="priority"
                name="priority"
                defaultValue="MEDIUM"
                className={erpSelectClassName}
              >
                {MAINTENANCE_PRIORITY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {maintenancePriorityLabel(opt.value)}
                  </option>
                ))}
              </select>
            </div>
            <Button type="submit" disabled={createPending} className="w-full">
              {createPending ? "Бүртгэж байна..." : "Хүсэлт илгээх"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Миний хүсэлтүүд</CardTitle>
          <p className="text-sm text-zinc-500 mt-1">Нийт {requests.length} хүсэлт</p>
        </CardHeader>
        <CardContent>
          {requests.length === 0 ? (
            <p className="py-10 text-center text-sm text-zinc-500">Засварын хүсэлт байхгүй</p>
          ) : (
            <div className="flex flex-col gap-3">
              {requests.map((req) => {
                const comments = commentsByRequest[req.id] ?? [];
                const expanded = expandedId === req.id;
                const canClose = !["COMPLETED", "CANCELLED"].includes(req.status);

                return (
                  <div
                    key={req.id}
                    className="rounded-xl ring-1 ring-zinc-200 dark:ring-zinc-800 p-4 flex flex-col gap-3"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="font-medium">{req.title}</div>
                        {req.description ? (
                          <p className="text-sm text-zinc-500 mt-1 line-clamp-2">{req.description}</p>
                        ) : null}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        <StatusBadge label={maintenanceStatusLabel(req.status)} tone={statusTone(req.status)} />
                        <StatusBadge
                          label={maintenancePriorityLabel(req.priority)}
                          tone={priorityTone(req.priority)}
                        />
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 text-xs text-zinc-500">
                      <span>{maintenanceCategoryLabel(req.category)}</span>
                      <span>·</span>
                      <span>{formatDateTimeMn(req.created_at)}</span>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setExpandedId(expanded ? null : req.id)}
                      >
                        <MessageSquare className="size-3.5 mr-1" />
                        Сэтгэгдэл ({comments.length})
                      </Button>
                      {canClose ? (
                        <form action={closeAction}>
                          <input type="hidden" name="request_id" value={req.id} />
                          <Button
                            type="submit"
                            variant="outline"
                            size="sm"
                            disabled={closePending}
                            className="text-rose-600 hover:text-rose-700 dark:text-rose-400"
                          >
                            <XCircle className="size-3.5 mr-1" />
                            Хаах
                          </Button>
                        </form>
                      ) : null}
                    </div>

                    {expanded ? (
                      <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 space-y-3">
                        {comments.length > 0 ? (
                          <div className="flex flex-col gap-2">
                            {comments.map((c) => (
                              <div
                                key={c.id}
                                className={cn(
                                  "rounded-lg px-3 py-2 text-sm",
                                  "bg-zinc-50 dark:bg-zinc-900/60",
                                )}
                              >
                                <p>{c.comment}</p>
                                <p className="text-[10px] text-zinc-500 mt-1">
                                  {formatDateTimeMn(c.created_at)}
                                </p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-zinc-500">Сэтгэгдэл байхгүй</p>
                        )}
                        {!["CANCELLED", "COMPLETED"].includes(req.status) ? (
                          <form action={commentAction} className="flex gap-2">
                            <input type="hidden" name="request_id" value={req.id} />
                            <Input
                              name="comment"
                              placeholder="Сэтгэгдэл бичих..."
                              required
                              className="flex-1"
                            />
                            <Button type="submit" size="sm" disabled={commentPending}>
                              Илгээх
                            </Button>
                          </form>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
