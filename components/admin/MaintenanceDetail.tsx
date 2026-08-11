"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import type { MaintenanceAdminRow } from "@/lib/queries/maintenance";
import type { MaintenanceComment, AuditLog } from "@/types";
import {
  updateMaintenanceAction,
  type MaintenanceActionState,
} from "@/app/admin/maintenance/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

const initialState: MaintenanceActionState = { status: "idle" };

type CommentRow = MaintenanceComment & { author_name: string };
type AuditRow = AuditLog & { actor_name: string };

type OperatorOption = {
  id: string;
  name: string;
  role: string;
};

function auditActionLabel(action: string): string {
  switch (action) {
    case "MAINTENANCE_UPDATED":
      return "Төлөв шинэчлэгдсэн";
    case "MAINTENANCE_ASSIGNED":
      return "Хариуцагч томилогдсон";
    default:
      return action;
  }
}

export function MaintenanceDetail({
  request,
  comments,
  auditLogs,
  operators,
  assignedToId,
}: {
  request: MaintenanceAdminRow;
  comments: CommentRow[];
  auditLogs: AuditRow[];
  operators: OperatorOption[];
  assignedToId: string | null;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(updateMaintenanceAction, initialState);

  useActionToast(state, {
    onSuccess: () => router.refresh(),
    successMessage: "Засварын хүсэлт шинэчлэгдлээ",
  });

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2 flex flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Хүсэлтийн мэдээлэл</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Info label="Гарчиг" value={request.title} />
            <Info
              label="Орон сууц"
              value={[request.building_name, request.tower, request.apartment_number]
                .filter(Boolean)
                .join(" · ")}
            />
            <Info label="Ангилал" value={maintenanceCategoryLabel(request.category)} />
            <div className="flex flex-col gap-1">
              <span className="text-xs uppercase tracking-wider text-zinc-500">Түвшин</span>
              <StatusBadge
                label={maintenancePriorityLabel(request.priority)}
                tone={maintenancePriorityTone(request.priority)}
              />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs uppercase tracking-wider text-zinc-500">Төлөв</span>
              <StatusBadge
                label={maintenanceStatusLabel(request.status)}
                tone={maintenanceStatusTone(request.status)}
              />
            </div>
            <Info
              label="Бүртгэсэн"
              value={formatDateTimeMn(request.created_at)}
            />
            {request.description ? (
              <div className="sm:col-span-2 flex flex-col gap-1">
                <span className="text-xs uppercase tracking-wider text-zinc-500">Тайлбар</span>
                <p className="text-sm whitespace-pre-wrap">{request.description}</p>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Төлөв шинэчлэх</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={formAction} className="flex flex-col gap-4">
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
                  <Label htmlFor="assignedTo">Хариуцагч томилох</Label>
                  <select
                    id="assignedTo"
                    name="assignedTo"
                    defaultValue={assignedToId ?? ""}
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
                  <Label htmlFor="comment">Тайлбар / тэмдэглэл</Label>
                  <Input
                    id="comment"
                    name="comment"
                    placeholder="Шинэчлэлтийн тайлбар..."
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <Button type="submit" disabled={pending}>
                  {pending ? "Хадгалж байна..." : "Хадгалах"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Тайлбарууд ({comments.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {comments.length === 0 ? (
              <p className="py-4 text-center text-sm text-zinc-500">Тайлбар байхгүй</p>
            ) : (
              <div className="flex flex-col divide-y divide-zinc-100 dark:divide-zinc-800">
                {comments.map((comment) => (
                  <div key={comment.id} className="py-3">
                    <div className="flex items-center justify-between gap-2 text-xs text-zinc-500">
                      <span className="font-medium text-zinc-700 dark:text-zinc-300">
                        {comment.author_name}
                      </span>
                      <span>{formatDateTimeMn(comment.created_at)}</span>
                    </div>
                    <p className="mt-1 text-sm whitespace-pre-wrap">{comment.comment}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="h-fit">
        <CardHeader>
          <CardTitle>Түүх</CardTitle>
        </CardHeader>
        <CardContent>
          {auditLogs.length === 0 ? (
            <p className="py-4 text-center text-sm text-zinc-500">Түүх байхгүй</p>
          ) : (
            <div className="flex flex-col divide-y divide-zinc-100 dark:divide-zinc-800">
              {auditLogs.map((log) => (
                <div key={log.id} className="py-3">
                  <div className="text-xs text-zinc-500">
                    {formatDateTimeMn(log.created_at)}
                  </div>
                  <div className="font-medium text-sm mt-0.5">{auditActionLabel(log.action)}</div>
                  <div className="text-xs text-zinc-500 mt-0.5">{log.actor_name}</div>
                  {log.new_data && typeof log.new_data === "object" ? (
                    <pre className="mt-1 text-[11px] text-zinc-600 dark:text-zinc-400 overflow-x-auto">
                      {JSON.stringify(log.new_data, null, 2)}
                    </pre>
                  ) : null}
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
      <span className="text-xs uppercase tracking-wider text-zinc-500">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
