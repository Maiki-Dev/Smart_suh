"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Ban, CheckCircle2, Crown, Trash2 } from "lucide-react";
import type { ApartmentAdminRow } from "@/lib/queries/apartments";
import type { ResidentAdminRow } from "@/lib/queries/residents";
import {
  createResidentAction,
  updateResidentAction,
  deactivateResidentAction,
  activateResidentAction,
  setResidentOwnerAction,
  deleteResidentAction,
  type ResidentActionState,
} from "@/app/admin/residents/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  StatusBadge,
  residentStatusTone,
} from "@/components/admin/StatusBadge";
import { residentStatusLabel } from "@/lib/admin/format";

const initialState: ResidentActionState = { status: "idle" };

type Filters = {
  q?: string;
  status?: string;
};

function ResidentFormDialog({
  onClose,
  apartments,
  resident,
  defaultApartmentId,
}: {
  onClose: () => void;
  apartments: ApartmentAdminRow[];
  resident?: ResidentAdminRow | null;
  defaultApartmentId?: string;
}) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const action = resident ? updateResidentAction : createResidentAction;
  const [state, formAction, pending] = useActionState(action, initialState);
  const formKey = resident?.id ?? "create";

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  useEffect(() => {
    if (state.status === "success") {
      router.refresh();
      onClose();
    }
  }, [state.status, router, onClose]);

  return (
    <dialog
      ref={dialogRef}
      className="fixed inset-0 z-50 m-auto w-[min(100%,560px)] rounded-xl border border-zinc-200 bg-white p-0 shadow-xl backdrop:bg-black/40 dark:border-zinc-800 dark:bg-zinc-900"
      onClose={onClose}
    >
      <form key={formKey} action={formAction} className="flex flex-col">
        {resident ? <input type="hidden" name="id" value={resident.id} /> : null}
        <div className="border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
          <h3 className="text-lg font-semibold">
            {resident ? "Оршин суугч засах" : "Шинэ оршин суугч"}
          </h3>
        </div>
        <div className="grid gap-4 px-5 py-4 sm:grid-cols-2">
          <div className="sm:col-span-2 flex flex-col gap-2">
            <Label htmlFor="apartment_id">Орон сууц</Label>
            <select
              id="apartment_id"
              name="apartment_id"
              defaultValue={resident?.apartment_id ?? defaultApartmentId ?? ""}
              required
              className="h-9 rounded-lg border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-800 dark:bg-zinc-950"
            >
              <option value="" disabled>
                Сонгох...
              </option>
              {apartments.map((apt) => (
                <option key={apt.id} value={apt.id}>
                  {[apt.building_name, apt.tower, apt.apartment_number].filter(Boolean).join(" · ")}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="first_name">Нэр</Label>
            <Input id="first_name" name="first_name" defaultValue={resident?.first_name ?? ""} required />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="last_name">Овог</Label>
            <Input id="last_name" name="last_name" defaultValue={resident?.last_name ?? ""} required />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="phone">Утас</Label>
            <Input id="phone" name="phone" defaultValue={resident?.phone ?? ""} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">И-мэйл</Label>
            <Input id="email" name="email" type="email" defaultValue={resident?.email ?? ""} />
          </div>
          <label className="sm:col-span-2 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="is_owner"
              defaultChecked={resident?.is_owner ?? !!defaultApartmentId}
              className="size-4 rounded border-zinc-300"
            />
            Эзэмшигч болгох
          </label>
          {state.status === "error" && state.message ? (
            <p className="sm:col-span-2 text-sm text-destructive">{state.message}</p>
          ) : null}
        </div>
        <div className="flex justify-end gap-2 border-t border-zinc-200 px-5 py-4 dark:border-zinc-800">
          <Button type="button" variant="outline" onClick={onClose}>
            Болих
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? "Хадгалж байна..." : "Хадгалах"}
          </Button>
        </div>
      </form>
    </dialog>
  );
}

export function ResidentManagement({
  residents,
  apartments,
  filters,
  total,
  defaultApartmentId,
  openCreateOnMount = false,
}: {
  residents: ResidentAdminRow[];
  apartments: ApartmentAdminRow[];
  filters: Filters;
  total: number;
  defaultApartmentId?: string;
  openCreateOnMount?: boolean;
}) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(openCreateOnMount);
  const [editing, setEditing] = useState<ResidentAdminRow | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function runAction(id: string, fn: (id: string) => Promise<ResidentActionState>) {
    setPendingId(id);
    await fn(id);
    router.refresh();
    setPendingId(null);
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader className="gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <CardTitle>Оршин суугчийн жагсаалт</CardTitle>
            <p className="text-sm text-zinc-500 mt-1">Нийт {total} оршин суугч</p>
          </div>
          <Button
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="size-4" />
            Шинэ оршин суугч
          </Button>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <form method="get" className="grid gap-3 md:grid-cols-3">
            <Input name="q" placeholder="Хайлт..." defaultValue={filters.q ?? ""} />
            <select
              name="status"
              defaultValue={filters.status ?? ""}
              className="h-9 rounded-lg border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-800 dark:bg-zinc-950"
            >
              <option value="">Бүх төлөв</option>
              <option value="ACTIVE">Идэвхтэй</option>
              <option value="INACTIVE">Идэвхгүй</option>
              <option value="MOVED_OUT">Нүүсэн</option>
            </select>
            <Button type="submit" variant="outline">
              Шүүх
            </Button>
          </form>

          <div className="overflow-x-auto rounded-xl ring-1 ring-zinc-200 dark:ring-zinc-800">
            <table className="w-full min-w-[980px] text-sm">
              <thead className="bg-zinc-50 text-left text-[11px] uppercase tracking-wider text-zinc-500 dark:bg-zinc-900/60">
                <tr>
                  <th className="px-3 py-3">Нэр</th>
                  <th className="px-3 py-3">Утас</th>
                  <th className="px-3 py-3">И-мэйл</th>
                  <th className="px-3 py-3">Орон сууц</th>
                  <th className="px-3 py-3">Барилга</th>
                  <th className="px-3 py-3">Эзэмшигч</th>
                  <th className="px-3 py-3">Төлөв</th>
                  <th className="px-3 py-3 text-right">Үйлдэл</th>
                </tr>
              </thead>
              <tbody>
                {residents.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-3 py-10 text-center text-zinc-500">
                      Оршин суугч олдсонгүй
                    </td>
                  </tr>
                ) : (
                  residents.map((resident) => (
                    <tr
                      key={resident.id}
                      className="border-t border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50/70 dark:hover:bg-zinc-900/40"
                    >
                      <td className="px-3 py-3 font-medium">
                        {resident.last_name} {resident.first_name}
                      </td>
                      <td className="px-3 py-3">{resident.phone ?? "—"}</td>
                      <td className="px-3 py-3">{resident.email ?? "—"}</td>
                      <td className="px-3 py-3">
                        {[resident.tower, resident.apartment_number].filter(Boolean).join(" · ")}
                      </td>
                      <td className="px-3 py-3">{resident.building_name}</td>
                      <td className="px-3 py-3">{resident.is_owner ? "Тийм" : "Үгүй"}</td>
                      <td className="px-3 py-3">
                        <StatusBadge
                          label={residentStatusLabel(resident.status)}
                          tone={residentStatusTone(resident.status)}
                        />
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex justify-end gap-1">
                          <Button
                            size="icon-sm"
                            variant="ghost"
                            disabled={pendingId === resident.id || resident.is_owner}
                            onClick={() => runAction(resident.id, setResidentOwnerAction)}
                            title="Эзэмшигч болгох"
                          >
                            <Crown className="size-4 text-amber-600" />
                          </Button>
                          <Button
                            size="icon-sm"
                            variant="ghost"
                            onClick={() => {
                              setEditing(resident);
                              setDialogOpen(true);
                            }}
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            size="icon-sm"
                            variant="ghost"
                            disabled={pendingId === resident.id}
                            onClick={() =>
                              runAction(
                                resident.id,
                                resident.status === "INACTIVE"
                                  ? activateResidentAction
                                  : deactivateResidentAction,
                              )
                            }
                            title={resident.status === "INACTIVE" ? "Идэвхжүүлэх" : "Идэвхгүй болгох (устгах биш)"}
                          >
                            {resident.status === "INACTIVE" ? (
                              <CheckCircle2 className="size-4 text-emerald-600" />
                            ) : (
                              <Ban className="size-4 text-rose-600" />
                            )}
                          </Button>
                          {resident.status === "INACTIVE" ? (
                            <Button
                              size="icon-sm"
                              variant="ghost"
                              disabled={pendingId === resident.id}
                              onClick={() => {
                                if (!confirm("Энэ оршин суугчийг бүрмосон устгах уу?")) return;
                                runAction(resident.id, deleteResidentAction);
                              }}
                              title="Бүрмосон устгах"
                            >
                              <Trash2 className="size-4 text-rose-600" />
                            </Button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {dialogOpen ? (
        <ResidentFormDialog
          key={editing?.id ?? "create"}
          onClose={() => {
            setDialogOpen(false);
            setEditing(null);
          }}
          apartments={apartments}
          resident={editing}
          defaultApartmentId={defaultApartmentId}
        />
      ) : null}
    </div>
  );
}
