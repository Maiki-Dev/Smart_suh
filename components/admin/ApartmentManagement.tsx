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
import { EmptyState } from "@/components/ui/empty-state";
import { ErpTableShell, erpTableHeadClass, erpTableRowClass } from "@/components/ui/erp-table";
import {
  erpDialogClassName,
  erpDialogFooterClassName,
  erpDialogHeaderClassName,
  erpSelectClassName,
} from "@/components/ui/erp-dialog";
import { notifyActionResult, useActionToast } from "@/lib/hooks/use-action-toast";
import { PaginationFormFields, TablePagination } from "@/components/admin/TablePagination";
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
import { feeBreakdownLabel } from "@/lib/fees/apartment-fees";
import { PropertyTabs } from "@/components/admin/PropertyTabs";
import { AdminPrimaryAction, AdminSectionToolbar } from "@/components/admin/AdminSectionToolbar";

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
        {apartment ? <input type="hidden" name="id" value={apartment.id} /> : null}
        <div className={erpDialogHeaderClassName}>
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
            <Label htmlFor="tower">Байр</Label>
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
            <Label htmlFor="apartment_number">Тоот №</Label>
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
          <div className="flex flex-col gap-2">
            <Label htmlFor="apartment_fee">{feeBreakdownLabel("apartment_fee")}</Label>
            <Input
              id="apartment_fee"
              name="apartment_fee"
              type="number"
              step="1"
              defaultValue={apartment?.apartment_fee ?? apartment?.monthly_fee ?? 0}
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="parking_fee">{feeBreakdownLabel("parking_fee")}</Label>
            <Input
              id="parking_fee"
              name="parking_fee"
              type="number"
              step="1"
              defaultValue={apartment?.parking_fee ?? 0}
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="water_fee">{feeBreakdownLabel("water_fee")}</Label>
            <Input
              id="water_fee"
              name="water_fee"
              type="number"
              step="1"
              defaultValue={apartment?.water_fee ?? 0}
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="electricity_fee">{feeBreakdownLabel("electricity_fee")}</Label>
            <Input
              id="electricity_fee"
              name="electricity_fee"
              type="number"
              step="1"
              defaultValue={apartment?.electricity_fee ?? 0}
              required
            />
          </div>
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

export function ApartmentManagement({
  apartments,
  filters,
  total,
  page,
  limit,
}: {
  apartments: ApartmentAdminRow[];
  filters: Filters;
  total: number;
  page: number;
  limit: number;
}) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ApartmentAdminRow | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function toggleStatus(apartment: ApartmentAdminRow) {
    setPendingId(apartment.id);
    const action =
      apartment.status === "VACANT" ? activateApartmentAction : deactivateApartmentAction;
    const result = await action(apartment.id);
    notifyActionResult(result);
    router.refresh();
    setPendingId(null);
  }

  return (
    <div className="flex flex-col gap-6">
      <AdminSectionToolbar
        tabs={<PropertyTabs active="apartments" />}
        action={
          <AdminPrimaryAction
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="size-4" />
            Шинэ орон сууц
          </AdminPrimaryAction>
        }
      />
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Орон сууцны жагсаалт</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">Нийт {total} орон сууц</p>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <form method="get" className="grid gap-3 md:grid-cols-4">
            <PaginationFormFields page={page} limit={limit} />
            <Input name="q" placeholder="Хайлт..." defaultValue={filters.q ?? ""} />
            <Input name="building" placeholder="Барилга..." defaultValue={filters.building ?? ""} />
            <select
              name="status"
              defaultValue={filters.status ?? ""}
              className={erpSelectClassName}
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

          <ErpTableShell>
            <table className="w-full min-w-[1100px] text-sm">
              <thead className={erpTableHeadClass}>
                <tr>
                  <th className="px-3 py-3">Барилга</th>
                  <th className="px-3 py-3">Байр</th>
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
                    <td colSpan={12}>
                      <EmptyState title="Орон сууц олдсонгүй" description="Шүүлт эсвэл хайлтаа өөрчилж үзнэ үү." />
                    </td>
                  </tr>
                ) : (
                  apartments.map((apt) => (
                    <tr key={apt.id} className={erpTableRowClass}>
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
          </ErpTableShell>
          <TablePagination total={total} page={page} limit={limit} />
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
