"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import type { MaintenanceAdminRow } from "@/lib/queries/maintenance";
import type { MaintenanceComment, AuditLog } from "@/types";
import {
  updateMaintenanceAction,
  addMaintenanceCommentAction,
  type MaintenanceActionState,
} from "@/app/admin/maintenance/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { erpSelectClassName } from "@/components/ui/erp-dialog";
import { useActionToast } from "@/lib/hooks/use-action-toast";
import {
  StatusBadge,
  maintenancePriorityTone,
  maintenanceStatusTone,
} from "@/components/admin/StatusBadge";
import {
  MAINTENANCE_PRIORITY_OPTIONS,
  MAINTENANCE_STATUS_OPTIONS,
  maintenanceCategoryLabel,
  maintenancePriorityLabel,
  maintenanceStatusLabel,
  roleLabel,
} from "@/lib/admin/format";
import { formatDateTimeMn } from "@/lib/format/datetime";
import { MessageSquare, History } from "lucide-react";

const initialState: MaintenanceActionState = { status: "idle" };

type CommentRow = MaintenanceComment & { author_name: string };
type AuditRow = AuditLog & { actor_name: string };

type OperatorOption = {
  id: string;
  name: string;
  role: string;
};

function formatAuditEntry(
  log: AuditRow,
  operators: OperatorOption[],
): string {
  const data = (log.new_data ?? {}) as Record<string, unknown>;
  const old = (log.old_data ?? {}) as Record<string, unknown>;

  switch (log.action) {
    case "MAINTENANCE_CREATED":
      return `"${String(data.title ?? "Хүсэлт")}" бүртгэгдсэн`;
    case "MAINTENANCE_ASSIGNED": {
      const assigneeId = data.assigned_to as string | undefined;
      if (!assigneeId) return "Хариуцагч хасагдсан";
      const name = operators.find((op) => op.id === assigneeId)?.name ?? "—";
      return `Хариуцагч томилогдсон: ${name}`;
    }
    case "MAINTENANCE_UPDATED": {
      if (data.closed_by === "resident") return "Оршин суугч хүсэлтийг цуцалсан";
      const parts: string[] = [];
      if (old.status !== data.status && data.status) {
        parts.push(`Төлөв → ${maintenanceStatusLabel(String(data.status))}`);
      }
      if (old.priority !== data.priority && data.priority) {
        parts.push(`Түвшин → ${maintenancePriorityLabel(String(data.priority))}`);
      }
      return parts.length ? parts.join(" · ") : "Мэдээлэл шинэчлэгдсэн";
    }
    default:
      return log.action;
  }
}

export function MaintenanceDetail({
  request,
  comments,
  auditLogs,
  operators,
}: {
  request: MaintenanceAdminRow;
  comments: CommentRow[];
  auditLogs: AuditRow[];
  operators: OperatorOption[];
}) {
  const router = useRouter();
  const [updateState, updateAction, updatePending] = useActionState(updateMaintenanceAction, initialState);
  const [commentState, commentAction, commentPending] = useActionState(addMaintenanceCommentAction, initialState);

  useActionToast(updateState, {
    onSuccess: () => router.refresh(),
    successMessage: "Засварын хүсэлт шинэчлэгдлээ",
  });
  useActionToast(commentState, {
    onSuccess: () => router.refresh(),
    successMessage: "Тайлбар нэмэгдлээ",
  });

  const apartmentLabel = [request.building_name, request.tower, request.apartment_number]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2 flex flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle>{request.title}</CardTitle>
            <CardDescription>{apartmentLabel}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Info label="Оршин суугч" value={request.resident_name ?? "—"} />
            <Info label="Хариуцагч" value={request.assigned_operator_name ?? "Томилоогүй"} />
            <Info label="Ангилал" value={maintenanceCategoryLabel(request.category)} />
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">Түвшин</span>
              <StatusBadge
                label={maintenancePriorityLabel(request.priority)}
                tone={maintenancePriorityTone(request.priority)}
              />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">Төлөв</span>
              <StatusBadge
                label={maintenanceStatusLabel(request.status)}
                tone={maintenanceStatusTone(request.status)}
              />
            </div>
            <Info label="Бүртгэсэн" value={formatDateTimeMn(request.created_at)} />
            {request.description ? (
              <div className="sm:col-span-2 flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">Тайлбар</span>
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{request.description}</p>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Удирдах</CardTitle>
            <CardDescription>Төлөв, түвшин, хариуцагч өөрчлөх</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={updateAction} className="flex flex-col gap-4">
              <input type="hidden" name="id" value={request.id} />
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="status">Төлөв</Label>
                  <select
                    id="status"
                    name="status"
                    defaultValue={request.status}
                    className={erpSelectClassName}
                  >
                    {MAINTENANCE_STATUS_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="priority">Түвшин</Label>
                  <select
                    id="priority"
                    name="priority"
                    defaultValue={request.priority}
                    className={erpSelectClassName}
                  >
                    {MAINTENANCE_PRIORITY_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2 flex flex-col gap-2">
                  <Label htmlFor="assignedTo">Хариуцагч</Label>
                  <select
                    id="assignedTo"
                    name="assignedTo"
                    defaultValue={request.assigned_to ?? ""}
                    className={erpSelectClassName}
                  >
                    <option value="">Сонгохгүй</option>
                    {operators.map((op) => (
                      <option key={op.id} value={op.id}>
                        {op.name} ({roleLabel(op.role)})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2 flex flex-col gap-2">
                  <Label htmlFor="comment">Тайлбартай хадгалах (заавал биш)</Label>
                  <Input id="comment" name="comment" placeholder="Шинэчлэлтийн тайлбар..." />
                </div>
              </div>
              <div className="flex justify-end">
                <Button type="submit" disabled={updatePending}>
                  {updatePending ? "Хадгалж байна..." : "Хадгалах"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="size-4" />
              Тайлбарууд ({comments.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {comments.length === 0 ? (
              <EmptyState
                icon={MessageSquare}
                title="Тайлбар байхгүй"
                description="Оршин суугч эсвэл админ тайлбар үлдээхэд энд харагдана."
                className="py-8"
              />
            ) : (
              <div className="divide-y divide-border">
                {comments.map((comment) => (
                  <div key={comment.id} className="py-3 first:pt-0 last:pb-0">
                    <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">{comment.author_name}</span>
                      <span>{formatDateTimeMn(comment.created_at)}</span>
                    </div>
                    <p className="mt-1 text-sm whitespace-pre-wrap leading-relaxed">{comment.comment}</p>
                  </div>
                ))}
              </div>
            )}

            <form action={commentAction} className="flex gap-2 border-t border-border pt-4">
              <input type="hidden" name="id" value={request.id} />
              <Input
                name="comment"
                placeholder="Тайлбар бичих..."
                required
                className="flex-1"
              />
              <Button type="submit" disabled={commentPending}>
                {commentPending ? "..." : "Илгээх"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <Card className="h-fit">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="size-4" />
            Түүх
          </CardTitle>
        </CardHeader>
        <CardContent>
          {auditLogs.length === 0 ? (
            <EmptyState title="Түүх байхгүй" className="py-8" />
          ) : (
            <div className="relative space-y-4 before:absolute before:left-[7px] before:top-2 before:h-[calc(100%-8px)] before:w-px before:bg-border">
              {auditLogs.map((log) => (
                <div key={log.id} className="relative pl-6">
                  <div className="absolute left-0 top-1.5 size-3.5 rounded-full border-2 border-background bg-primary" />
                  <p className="text-sm font-medium">{formatAuditEntry(log, operators)}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{log.actor_name}</p>
                  <p className="text-[11px] text-muted-foreground tabular-nums">
                    {formatDateTimeMn(log.created_at)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
