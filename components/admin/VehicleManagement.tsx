"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Ban, CheckCircle2, RefreshCw } from "lucide-react";
import type { VehicleAdminRow } from "@/lib/queries/vehicles";
import type { ApartmentAdminRow } from "@/lib/queries/apartments";
import {
  activateVehicleAction,
  createVehicleAction,
  deactivateVehicleAction,
  recalculateVehicleAccessAction,
  updateVehicleAction,
  type VehicleActionState,
} from "@/app/admin/vehicles/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  erpDialogClassName,
  erpDialogFooterClassName,
  erpDialogHeaderClassName,
  erpSelectClassName,
} from "@/components/ui/erp-dialog";
import { notifyActionResult, useActionToast } from "@/lib/hooks/use-action-toast";
import { PaginationFormFields, TablePagination } from "@/components/admin/TablePagination";
import { StatusBadge, gateAccessTone } from "@/components/admin/StatusBadge";
import {
  gateAccessStatusLabel,
  vehicleTypeLabel,
} from "@/lib/admin/format";

const initialState: VehicleActionState = { status: "idle" };

const VEHICLE_TYPES = ["CAR", "MOTORCYCLE", "VAN", "TRUCK", "OTHER"] as const;

type Filters = {
  q?: string;
  active?: string;
  gate?: string;
  apartment?: string;
};

function VehicleFormDialog({
  onClose,
  apartments,
  vehicle,
}: {
  onClose: () => void;
  apartments: ApartmentAdminRow[];
  vehicle?: VehicleAdminRow | null;
}) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const action = vehicle ? updateVehicleAction : createVehicleAction;
  const [state, formAction, pending] = useActionState(action, initialState);
  const formKey = vehicle?.id ?? "create";

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  useActionToast(state, {
    onSuccess: () => {
      router.refresh();
      onClose();
    },
  });

  return (
    <dialog
      ref={dialogRef}
      className={erpDialogClassName}
      onClose={onClose}
    >
      <form key={formKey} action={formAction} className="flex flex-col">
        {vehicle ? <input type="hidden" name="id" value={vehicle.id} /> : null}
        <div className={erpDialogHeaderClassName}>
          <h3 className="text-lg font-semibold">
            {vehicle ? "Машин засах" : "Шинэ машин"}
          </h3>
        </div>
        <div className="grid gap-4 px-5 py-4 sm:grid-cols-2">
          <div className="sm:col-span-2 flex flex-col gap-2">
            <Label htmlFor="apartment_id">Орон сууц</Label>
            <select
              id="apartment_id"
              name="apartment_id"
              defaultValue={vehicle?.apartment_id ?? ""}
              required
              disabled={!!vehicle}
              className={`${erpSelectClassName} disabled:opacity-60`}
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
            <Label htmlFor="plate_number">Улсын дугаар</Label>
            <Input id="plate_number" name="plate_number" defaultValue={vehicle?.plate_number ?? ""} required />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="vehicle_type">Төрөл</Label>
            <select
              id="vehicle_type"
              name="vehicle_type"
              defaultValue={vehicle?.vehicle_type ?? "CAR"}
              className={erpSelectClassName}
            >
              {VEHICLE_TYPES.map((type) => (
                <option key={type} value={type}>
                  {vehicleTypeLabel(type)}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="owner_name">Эзэмшигч</Label>
            <Input id="owner_name" name="owner_name" defaultValue={vehicle?.owner_name ?? ""} />
          </div>
          {vehicle ? (
            <div className="flex flex-col gap-2">
              <Label htmlFor="rfid_number">RFID</Label>
              <Input
                id="rfid_number"
                name="rfid_number"
                defaultValue={vehicle.rfid_number ?? ""}
                readOnly
                className="bg-zinc-50 dark:bg-zinc-900/60"
              />
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <Label>RFID</Label>
              <p className="rounded-lg border border-dashed border-zinc-200 px-3 py-2 text-sm text-zinc-500 dark:border-zinc-700">
                Автоматаар үүснэ (жишээ: RFID-ABC-1002)
              </p>
            </div>
          )}
        </div>
        <div className={erpDialogFooterClassName}>
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

export function VehicleManagement({
  vehicles,
  apartments,
  filters,
  total,
  page,
  limit,
}: {
  vehicles: VehicleAdminRow[];
  apartments: ApartmentAdminRow[];
  filters: Filters;
  total: number;
  page: number;
  limit: number;
}) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editVehicle, setEditVehicle] = useState<VehicleAdminRow | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function runAction(id: string, fn: (id: string) => Promise<VehicleActionState>) {
    setPendingId(id);
    const result = await fn(id);
    notifyActionResult(result);
    router.refresh();
    setPendingId(null);
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader className="gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <CardTitle>Машин</CardTitle>
            <p className="text-sm text-zinc-500 mt-1">Нийт {total} машин</p>
          </div>
          <Button
            onClick={() => {
              setEditVehicle(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="size-4" />
            Шинэ машин
          </Button>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <form method="get" className="grid gap-3 lg:grid-cols-5">
            <PaginationFormFields page={page} limit={limit} />
            <Input name="q" placeholder="Хайлт..." defaultValue={filters.q ?? ""} className="lg:col-span-2" />
            <select
              name="active"
              defaultValue={filters.active ?? ""}
              className={erpSelectClassName}
            >
              <option value="">Бүх төлөв</option>
              <option value="true">Идэвхтэй</option>
              <option value="false">Идэвхгүй</option>
            </select>
            <select
              name="gate"
              defaultValue={filters.gate ?? ""}
              className={erpSelectClassName}
            >
              <option value="">Зогсоолын эрх</option>
              <option value="true">Идэвхтэй</option>
              <option value="false">Идэвхгүй</option>
            </select>
            <Button type="submit" variant="outline">
              Шүүх
            </Button>
          </form>

          <div className="overflow-x-auto rounded-xl ring-1 ring-zinc-200 dark:ring-zinc-800">
            <table className="w-full min-w-[1100px] text-sm">
              <thead className="bg-zinc-50 text-left text-[11px] uppercase tracking-wider text-zinc-500 dark:bg-zinc-900/60">
                <tr>
                  <th className="px-3 py-3">Улсын дугаар</th>
                  <th className="px-3 py-3">Орон сууц</th>
                  <th className="px-3 py-3">Эзэмшигч</th>
                  <th className="px-3 py-3">RFID</th>
                  <th className="px-3 py-3">Зогсоолын эрх</th>
                  <th className="px-3 py-3">Төлөв</th>
                  <th className="px-3 py-3 text-right">Үйлдэл</th>
                </tr>
              </thead>
              <tbody>
                {vehicles.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-3 py-10 text-center text-zinc-500">
                      Машин олдсонгүй
                    </td>
                  </tr>
                ) : (
                  vehicles.map((vehicle) => (
                    <tr key={vehicle.id} className="border-t border-zinc-100 dark:border-zinc-800">
                      <td className="px-3 py-3 font-medium">{vehicle.plate_number}</td>
                      <td className="px-3 py-3">
                        {[vehicle.building_name, vehicle.tower, vehicle.apartment_number].filter(Boolean).join(" · ")}
                      </td>
                      <td className="px-3 py-3">{vehicle.owner_name ?? "—"}</td>
                      <td className="px-3 py-3">{vehicle.rfid_number ?? "—"}</td>
                      <td className="px-3 py-3">
                        <StatusBadge
                          label={gateAccessStatusLabel(vehicle.gate_access)}
                          tone={gateAccessTone(vehicle.gate_access)}
                        />
                        {vehicle.disabled_reason ? (
                          <div className="text-xs text-zinc-500 mt-1 max-w-xs">{vehicle.disabled_reason}</div>
                        ) : null}
                      </td>
                      <td className="px-3 py-3">
                        <StatusBadge
                          label={vehicle.active ? "Идэвхтэй" : "Идэвхгүй"}
                          tone={vehicle.active ? "emerald" : "zinc"}
                        />
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex justify-end gap-1">
                          <Button
                            size="icon-sm"
                            variant="ghost"
                            title="Зогсоолын эрх дахин тооцоолох"
                            disabled={pendingId === vehicle.id || isPending}
                            onClick={() => startTransition(() => runAction(vehicle.id, recalculateVehicleAccessAction))}
                          >
                            <RefreshCw className="size-4" />
                          </Button>
                          <Button
                            size="icon-sm"
                            variant="ghost"
                            onClick={() => {
                              setEditVehicle(vehicle);
                              setDialogOpen(true);
                            }}
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <Link href={`/admin/gate-access?apartment=${vehicle.apartment_id}`}>
                            <Button size="icon-sm" variant="ghost" title="Түүх">
                              <span className="text-xs">LOG</span>
                            </Button>
                          </Link>
                          {vehicle.active ? (
                            <Button
                              size="icon-sm"
                              variant="ghost"
                              disabled={pendingId === vehicle.id}
                              onClick={() => runAction(vehicle.id, deactivateVehicleAction)}
                            >
                              <Ban className="size-4" />
                            </Button>
                          ) : (
                            <Button
                              size="icon-sm"
                              variant="ghost"
                              disabled={pendingId === vehicle.id}
                              onClick={() => runAction(vehicle.id, activateVehicleAction)}
                            >
                              <CheckCircle2 className="size-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <TablePagination total={total} page={page} limit={limit} />
        </CardContent>
      </Card>

      {dialogOpen ? (
        <VehicleFormDialog
          apartments={apartments}
          vehicle={editVehicle}
          onClose={() => setDialogOpen(false)}
        />
      ) : null}
    </div>
  );
}
