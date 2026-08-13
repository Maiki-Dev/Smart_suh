"use client";

import { useActionState } from "react";
import { RefreshCw, CreditCard, CheckCircle2, AlertTriangle } from "lucide-react";
import type { GateAccessLog, Vehicle } from "@/types";
import {
  refreshResidentGateAccessAction,
  updateResidentVehicleAction,
  type ResidentVehicleActionState,
} from "@/app/resident/vehicle/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { erpSelectClassName } from "@/components/ui/erp-dialog";
import { useActionToast } from "@/lib/hooks/use-action-toast";
import { StatusBadge, gateAccessTone } from "@/components/admin/StatusBadge";
import {
  gateAccessStatusLabel,
  gateActionLabel,
  vehicleTypeLabel,
  formatMNT,
} from "@/lib/admin/format";
import { formatDateTimeMn } from "@/lib/format/datetime";
import { GATE_RESTORED_MESSAGE } from "@/lib/gate/consecutive-unpaid";
import { cn } from "@/lib/utils";

const initialState: ResidentVehicleActionState = { status: "idle" };

const VEHICLE_TYPES = ["CAR", "MOTORCYCLE", "VAN", "TRUCK", "OTHER"] as const;

export function ResidentVehiclePanel({
  vehicle,
  gateAccess,
  consecutiveUnpaidMonths,
  disabledReason,
  logs,
  totalDebt = 0,
  paymentUrl = "#",
}: {
  vehicle: Vehicle | null;
  gateAccess: boolean;
  consecutiveUnpaidMonths: number;
  disabledReason: string | null;
  logs: GateAccessLog[];
  totalDebt?: number;
  paymentUrl?: string;
}) {
  const [state, formAction, pending] = useActionState(updateResidentVehicleAction, initialState);
  const [refreshState, refreshAction, refreshPending] = useActionState(
    async () => refreshResidentGateAccessAction(),
    initialState,
  );

  useActionToast(state, { successMessage: "Машины мэдээлэл хадгалагдлаа" });
  useActionToast(refreshState, { successMessage: "Зогсоолын эрх шалгагдлаа" });

  const hasDebt = totalDebt > 0;
  const wireHref = paymentUrl || "#";
  const openWire = (e: React.MouseEvent) => {
    if (!paymentUrl || paymentUrl === "#") {
      e.preventDefault();
    }
  };

  if (!vehicle) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-zinc-500">
          Таны орон сууцанд машин бүртгэгдээгүй байна. СӨХ-ын админтай холбогдоно уу.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle>{vehicle.plate_number}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-zinc-500 mb-2">
              GATE ACCESS
            </div>
            <StatusBadge
              label={gateAccessStatusLabel(gateAccess)}
              tone={gateAccessTone(gateAccess)}
              className="text-sm px-3 py-1"
            />
          </div>
          {!gateAccess && disabledReason ? (
            <p className="text-sm text-rose-600 dark:text-rose-400">{disabledReason}</p>
          ) : gateAccess ? (
            <p className="text-sm text-emerald-600 dark:text-emerald-400">
              {GATE_RESTORED_MESSAGE}
            </p>
          ) : null}
          <div className="text-xs text-zinc-500">
            Дараалан төлөгдөөгүй сар: {consecutiveUnpaidMonths}
          </div>
          <form action={refreshAction}>
            <Button type="submit" variant="outline" size="sm" disabled={refreshPending}>
              <RefreshCw className="size-4" />
              Эрх шалгах
            </Button>
          </form>

          <Separator className="my-1" />

          <div className="rounded-lg border border-border bg-muted/30 p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="text-[11px] uppercase tracking-wider text-zinc-500">
                Үлдэгдэл
              </div>
              {hasDebt ? (
                <AlertTriangle className="size-3.5 text-rose-500 shrink-0" />
              ) : (
                <CheckCircle2 className="size-3.5 text-emerald-500 shrink-0" />
              )}
            </div>
            <div
              className={cn(
                "mt-1 text-2xl font-semibold tabular-nums tracking-tight",
                hasDebt && "text-rose-600 dark:text-rose-400",
              )}
            >
              {formatMNT(totalDebt)}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {hasDebt
                ? consecutiveUnpaidMonths >= 2
                  ? "RFID эрх сэргээхэд төлбөр төлөх шаардлагатай"
                  : "Нээлттэй нэхэмжлэлийн үлдэгдэл"
                : "Бүх төлбөр төлөгдсөн"}
            </p>
            <div className="mt-3 flex flex-col gap-2">
              <a
                href={wireHref}
                target="_blank"
                rel="noreferrer"
                onClick={openWire}
                className={cn(
                  "inline-flex h-9 items-center justify-center gap-1.5 rounded-md px-3 text-sm font-medium transition-colors",
                  hasDebt || paymentUrl === "#"
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "bg-emerald-600 text-white hover:bg-emerald-600/90",
                )}
              >
                <CreditCard className="size-4" />
                {hasDebt ? "Төлбөр төлөх (Wire.mn)" : "Wire.mn"}
              </a>
              <a
                href="/resident/payments"
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-border bg-background px-3 text-sm font-medium text-foreground transition-colors hover:bg-muted/50"
              >
                Нэхэмжлэл үзэх
              </a>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Машины мэдээлэл</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="grid gap-4 sm:grid-cols-2">
            <input type="hidden" name="id" value={vehicle.id} />
            <div className="flex flex-col gap-2">
              <Label htmlFor="plate_number">Улсын дугаар</Label>
              <Input id="plate_number" name="plate_number" defaultValue={vehicle.plate_number} required />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="vehicle_type">Төрөл</Label>
              <select
                id="vehicle_type"
                name="vehicle_type"
                defaultValue={vehicle.vehicle_type}
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
              <Input id="owner_name" name="owner_name" defaultValue={vehicle.owner_name ?? ""} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="rfid_number">RFID</Label>
              <Input id="rfid_number" name="rfid_number" defaultValue={vehicle.rfid_number ?? ""} />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={pending}>
                {pending ? "Хадгалж байна..." : "Хадгалах"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="lg:col-span-3">
        <CardHeader>
          <CardTitle>Зогсоолын түүх</CardTitle>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <p className="py-8 text-center text-sm text-zinc-500">Түүх байхгүй</p>
          ) : (
            <div className="flex flex-col divide-y divide-zinc-100 dark:divide-zinc-800">
              {logs.map((log) => (
                <div key={log.id} className="flex items-center justify-between gap-3 py-3">
                  <div>
                    <div className="font-medium">{gateActionLabel(log.action)}</div>
                    <div className="text-xs text-zinc-500">{log.reason ?? log.triggered_by ?? "—"}</div>
                  </div>
                  <div className="text-xs text-zinc-500">
                    {formatDateTimeMn(log.created_at)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
