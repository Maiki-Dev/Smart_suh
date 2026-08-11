"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Eye, Ban, CheckCircle2 } from "lucide-react";
import type { ApartmentAdminRow } from "@/lib/queries/apartments";
import {
  createApartmentAction,
  updateApartmentAction,
  deactivateApartmentAction,
  activateApartmentAction,
  type ApartmentActionState,
} from "@/app/admin/apartments/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  StatusBadge,
  apartmentStatusTone,
  paymentStatusTone,
} from "@/components/admin/StatusBadge";
import {
  apartmentStatusLabel,
  formatMNT,
  paymentStatusLabel,
  vehicleStatusLabel,
} from "@/lib/admin/format";

const initialState: ApartmentActionState = { status: "idle" };

type Filters = {
  q?: string;
  building?: string;
  status?: string;
};

function ApartmentFormDialog({
  onClose,
  apartment,
}: {
  onClose: () => void;
  apartment?: ApartmentAdminRow | null;
}) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const action = apartment ? updateApartmentAction : createApartmentAction;
  const [state, formAction, pending] = useActionState(action, initialState);
  const formKey = apartment?.id ?? "create";

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
        {apartment ? <input type="hidden" name="id" value={apartment.id} /> : null}
        <div className="border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
          <h3 className="text-lg font-semibold">
            {apartment ? "Орон сууц засах" : "Шинэ орон сууц"}
          </h3>
        </div>
        <div className="grid gap-4 px-5 py-4 sm:grid-cols-2">
          <div className="sm:col-span-2 flex flex-col gap-2">
            <Label htmlFor="building_name">Барилга</Label>
            <Input
              id="building_name"
              name="building_name"
              defaultValue={apartment?.building_name ?? ""}
              placeholder="Жишээ нь: Tower A, Блок 1..."
              required
            />
            {state.fieldErrors?.building_name?.[0] ? (
              <p className="text-xs text-destructive">{state.fieldErrors.building_name[0]}</p>
            ) : null}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="tower">Цамхаг</Label>
            <Input id="tower" name="tower" defaultValue={apartment?.tower ?? ""} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="entrance">Орц</Label>
            <Input id="entrance" name="entrance" defaultValue={apartment?.entrance ?? ""} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="floor">Давхар</Label>
            <Input id="floor" name="floor" type="number" defaultValue={apartment?.floor ?? ""} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="apartment_number">Орон сууцны №</Label>
            <Input
              id="apartment_number"
              name="apartment_number"
              defaultValue={apartment?.apartment_number ?? ""}
              required
            />
            {state.fieldErrors?.apartment_number?.[0] ? (
              <p className="text-xs text-destructive">{state.fieldErrors.apartment_number[0]}</p>
            ) : null}
          </div>
          <div className="flex flex-col gap-2 sm:col-span-2">
            <Label htmlFor="monthly_fee">Сарын төлбөр</Label>
            <Input
              id="monthly_fee"
              name="monthly_fee"
              type="number"
              step="1"
              defaultValue={apartment?.monthly_fee ?? 0}
              required
            />
          </div>
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

export function ApartmentManagement({
  apartments,
  filters,
  total,
}: {
  apartments: ApartmentAdminRow[];
  filters: Filters;
  total: number;
}) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ApartmentAdminRow | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function toggleStatus(apartment: ApartmentAdminRow) {
    setPendingId(apartment.id);
    const action =
      apartment.status === "VACANT" ? activateApartmentAction : deactivateApartmentAction;
    await action(apartment.id);
    router.refresh();
    setPendingId(null);
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader className="gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <CardTitle>Орон сууцны жагсаалт</CardTitle>
            <p className="text-sm text-zinc-500 mt-1">Нийт {total} орон сууц</p>
          </div>
          <Button
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="size-4" />
            Шинэ орон сууц
          </Button>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <form method="get" className="grid gap-3 md:grid-cols-4">
            <Input name="q" placeholder="Хайлт..." defaultValue={filters.q ?? ""} />
            <Input name="building" placeholder="Барилга..." defaultValue={filters.building ?? ""} />
            <select
              name="status"
              defaultValue={filters.status ?? ""}
              className="h-9 rounded-lg border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-800 dark:bg-zinc-950"
            >
              <option value="">Бүх төлөв</option>
              <option value="OCCUPIED">Оршин сууж байгаа</option>
              <option value="VACANT">Хоосон</option>
              <option value="MAINTENANCE">Засвар</option>
            </select>
            <Button type="submit" variant="outline">
              Шүүх
            </Button>
          </form>

          <div className="overflow-x-auto rounded-xl ring-1 ring-zinc-200 dark:ring-zinc-800">
            <table className="w-full min-w-[1100px] text-sm">
              <thead className="bg-zinc-50 text-left text-[11px] uppercase tracking-wider text-zinc-500 dark:bg-zinc-900/60">
                <tr>
                  <th className="px-3 py-3">Барилга</th>
                  <th className="px-3 py-3">Цамхаг</th>
                  <th className="px-3 py-3">Орц</th>
                  <th className="px-3 py-3">Давхар</th>
                  <th className="px-3 py-3">Орон сууц</th>
                  <th className="px-3 py-3">Сарын төлбөр</th>
                  <th className="px-3 py-3">Эзэмшигч</th>
                  <th className="px-3 py-3">Оршин суугч</th>
                  <th className="px-3 py-3">Төлбөр</th>
                  <th className="px-3 py-3">Машин</th>
                  <th className="px-3 py-3">Төлөв</th>
                  <th className="px-3 py-3 text-right">Үйлдэл</th>
                </tr>
              </thead>
              <tbody>
                {apartments.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="px-3 py-10 text-center text-zinc-500">
                      Орон сууц олдсонгүй
                    </td>
                  </tr>
                ) : (
                  apartments.map((apt) => (
                    <tr
                      key={apt.id}
                      className="border-t border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50/70 dark:hover:bg-zinc-900/40"
                    >
                      <td className="px-3 py-3">{apt.building_name}</td>
                      <td className="px-3 py-3">{apt.tower ?? "—"}</td>
                      <td className="px-3 py-3">{apt.entrance ?? "—"}</td>
                      <td className="px-3 py-3">{apt.floor ?? "—"}</td>
                      <td className="px-3 py-3 font-medium">{apt.apartment_number}</td>
                      <td className="px-3 py-3 tabular-nums">{formatMNT(apt.monthly_fee)}</td>
                      <td className="px-3 py-3">{apt.owner_name ?? "—"}</td>
                      <td className="px-3 py-3">{apt.resident_count}</td>
                      <td className="px-3 py-3">
                        <StatusBadge
                          label={paymentStatusLabel(apt.payment_status)}
                          tone={paymentStatusTone(apt.payment_status)}
                        />
                      </td>
                      <td className="px-3 py-3">
                        {vehicleStatusLabel(apt.active_vehicle_count, apt.vehicle_count)}
                      </td>
                      <td className="px-3 py-3">
                        <StatusBadge
                          label={apartmentStatusLabel(apt.status)}
                          tone={apartmentStatusTone(apt.status)}
                        />
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex justify-end gap-1">
                          <Link
                            href={`/admin/apartments/${apt.id}`}
                            className="inline-flex size-7 items-center justify-center rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800"
                          >
                            <Eye className="size-4" />
                          </Link>
                          <Button
                            size="icon-sm"
                            variant="ghost"
                            onClick={() => {
                              setEditing(apt);
                              setDialogOpen(true);
                            }}
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            size="icon-sm"
                            variant="ghost"
                            disabled={pendingId === apt.id}
                            onClick={() => toggleStatus(apt)}
                            title={apt.status === "VACANT" ? "Идэвхжүүлэх" : "Хоосон болгох (устгах биш)"}
                          >
                            {apt.status === "VACANT" ? (
                              <CheckCircle2 className="size-4 text-emerald-600" />
                            ) : (
                              <Ban className="size-4 text-rose-600" />
                            )}
                          </Button>
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
        <ApartmentFormDialog
          key={editing?.id ?? "create"}
          onClose={() => {
            setDialogOpen(false);
            setEditing(null);
          }}
          apartment={editing}
        />
      ) : null}
    </div>
  );
}
