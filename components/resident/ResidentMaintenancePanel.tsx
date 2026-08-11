"use client";

import { useActionState, useState } from "react";
import { MessageSquare, XCircle, Wrench, AlertTriangle } from "lucide-react";
import type { MaintenanceRequest } from "@/types";
import type { MaintenanceCommentWithAuthor } from "@/lib/queries/maintenance";
import {
  createMaintenanceRequestAction,
  addCommentAction,
  closeMaintenanceAction,
  type ResidentMaintenanceActionState,
} from "@/app/resident/maintenance/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
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
  commentsByRequest: Record<string, MaintenanceCommentWithAuthor[]>;
  hasApartment: boolean;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [createState, createAction, createPending] = useActionState(createMaintenanceRequestAction, initialState);
  const [commentState, commentAction, commentPending] = useActionState(addCommentAction, initialState);
  const [closeState, closeAction, closePending] = useActionState(closeMaintenanceAction, initialState);

  useActionToast(createState, { successMessage: "Засварын хүсэлт илгээгдлээ" });
  useActionToast(commentState, { successMessage: "Сэтгэгдэл нэмэгдлээ" });
  useActionToast(closeState, { successMessage: "Хүсэлт хаагдлаа" });

  const openCount = requests.filter((r) => ["OPEN", "IN_PROGRESS", "ON_HOLD"].includes(r.status)).length;

  if (!hasApartment) {
    return (
      <Card>
        <CardContent className="py-12">
          <EmptyState
            icon={Wrench}
            title="Орон сууц холбоогүй"
            description="Засварын хүсэлт илгээхийн тулд админаас орон сууцаа холбуулаарай."
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle>Шинэ хүсэлт</CardTitle>
          <CardDescription>Асуудлын товч мэдээлэл оруулна</CardDescription>
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
                className="rounded-lg border border-input bg-transparent px-3 py-2 text-sm resize-none"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="category">Ангилал</Label>
              <select id="category" name="category" defaultValue="OTHER" className={erpSelectClassName}>
                {MAINTENANCE_CATEGORY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {maintenanceCategoryLabel(opt.value)}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="priority">Чухал байдал</Label>
              <select id="priority" name="priority" defaultValue="MEDIUM" className={erpSelectClassName}>
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
          <CardDescription>
            {openCount > 0 ? `${openCount} нээлттэй хүсэлт` : "Нээлттэй хүсэлт байхгүй"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {requests.length === 0 ? (
            <EmptyState
              icon={Wrench}
              title="Засварын хүсэлт байхгүй"
              description="Зүүн талын формоор шинэ хүсэлт илгээнэ үү."
            />
          ) : (
            <div className="flex flex-col gap-3">
              {requests.map((req) => {
                const comments = commentsByRequest[req.id] ?? [];
                const expanded = expandedId === req.id;
                const canClose = !["COMPLETED", "CANCELLED"].includes(req.status);
                const isCritical = req.priority === "CRITICAL" && canClose;

                return (
                  <div
                    key={req.id}
                    className={cn(
                      "rounded-xl border border-border p-4 flex flex-col gap-3",
                      isCritical && "border-rose-200 bg-rose-50/30 dark:border-rose-500/20 dark:bg-rose-500/5",
                    )}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          {isCritical ? <AlertTriangle className="size-4 text-rose-500 shrink-0" /> : null}
                          <div className="font-medium">{req.title}</div>
                        </div>
                        {req.description ? (
                          <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{req.description}</p>
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

                    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
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
                        <form
                          action={closeAction}
                          onSubmit={(event) => {
                            if (!confirm(`"${req.title}" хүсэлтийг цуцлах уу?`)) {
                              event.preventDefault();
                            }
                          }}
                        >
                          <input type="hidden" name="request_id" value={req.id} />
                          <Button
                            type="submit"
                            variant="outline"
                            size="sm"
                            disabled={closePending}
                            className="text-rose-600 hover:text-rose-700 dark:text-rose-400"
                          >
                            <XCircle className="size-3.5 mr-1" />
                            Цуцлах
                          </Button>
                        </form>
                      ) : null}
                    </div>

                    {expanded ? (
                      <div className="pt-3 border-t border-border space-y-3">
                        {comments.length > 0 ? (
                          <div className="flex flex-col gap-2">
                            {comments.map((c) => (
                              <div key={c.id} className="rounded-lg bg-muted/50 px-3 py-2 text-sm">
                                <p>{c.comment}</p>
                                <p className="text-[11px] text-muted-foreground mt-1">
                                  {c.author_name} · {formatDateTimeMn(c.created_at)}
                                </p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground">Сэтгэгдэл байхгүй</p>
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
