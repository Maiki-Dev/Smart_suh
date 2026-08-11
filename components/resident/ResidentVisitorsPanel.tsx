"use client";

import { useActionState, useState } from "react";
import { Ban, QrCode } from "lucide-react";
import type { VisitorPass, PassStatus } from "@/types";
import {
  createVisitorPassAction,
  cancelVisitorPassAction,
  type ResidentVisitorActionState,
} from "@/app/resident/visitors/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { passStatusLabel } from "@/lib/admin/format";
import { VisitorQrDisplay } from "@/components/resident/VisitorQrDisplay";
import { cn } from "@/lib/utils";

const initialState: ResidentVisitorActionState = { status: "idle" };

const TABS: { key: PassStatus; label: string }[] = [
  { key: "ACTIVE", label: "Идэвхтэй" },
  { key: "EXPIRED", label: "Хугацаа дууссан" },
  { key: "CANCELLED", label: "Цуцлагдсан" },
  { key: "USED", label: "Ашигласан" },
];

function passTone(status: string): "emerald" | "amber" | "rose" | "zinc" {
  switch (status) {
    case "ACTIVE":
      return "emerald";
    case "USED":
      return "zinc";
    case "EXPIRED":
      return "amber";
    case "CANCELLED":
      return "rose";
    default:
      return "zinc";
  }
}

function defaultValidFrom() {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 16);
}

function defaultValidUntil() {
  const end = new Date();
  end.setHours(end.getHours() + 24);
  end.setMinutes(end.getMinutes() - end.getTimezoneOffset());
  return end.toISOString().slice(0, 16);
}

export function ResidentVisitorsPanel({
  passes,
  hasApartment,
}: {
  passes: VisitorPass[];
  hasApartment: boolean;
}) {
  const [activeTab, setActiveTab] = useState<PassStatus>("ACTIVE");
  const [expandedQr, setExpandedQr] = useState<string | null>(null);
  const [createState, createAction, createPending] = useActionState(createVisitorPassAction, initialState);
  const [cancelState, cancelAction, cancelPending] = useActionState(cancelVisitorPassAction, initialState);

  const filtered = passes.filter((p) => p.status === activeTab);

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
          <CardTitle>Шинэ зочны эрх</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createAction} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="visitor_name">Зочны нэр</Label>
              <Input id="visitor_name" name="visitor_name" required placeholder="Батбаяр" />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="phone">Утас</Label>
              <Input id="phone" name="phone" type="tel" placeholder="99112233" />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="plate_number">Машины дугаар</Label>
              <Input id="plate_number" name="plate_number" placeholder="1234УБА" />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="valid_from">Эхлэх хугацаа</Label>
              <Input
                id="valid_from"
                name="valid_from"
                type="datetime-local"
                defaultValue={defaultValidFrom()}
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="valid_until">Дуусах хугацаа</Label>
              <Input
                id="valid_until"
                name="valid_until"
                type="datetime-local"
                defaultValue={defaultValidUntil()}
                required
              />
            </div>
            {createState.message ? (
              <p className={`text-sm ${createState.status === "error" ? "text-destructive" : "text-emerald-600"}`}>
                {createState.message}
              </p>
            ) : null}
            <Button type="submit" disabled={createPending} className="w-full">
              {createPending ? "Үүсгэж байна..." : "Эрх үүсгэх"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Зочны эрхүүд</CardTitle>
          <div className="flex flex-wrap gap-1.5 mt-3">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                  activeTab === tab.key
                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300"
                    : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700",
                )}
              >
                {tab.label}
                <span className="ml-1.5 tabular-nums opacity-70">
                  ({passes.filter((p) => p.status === tab.key).length})
                </span>
              </button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          {cancelState.message && cancelState.status !== "idle" ? (
            <p className={`text-sm mb-4 ${cancelState.status === "error" ? "text-destructive" : "text-emerald-600"}`}>
              {cancelState.message}
            </p>
          ) : null}

          {filtered.length === 0 ? (
            <p className="py-10 text-center text-sm text-zinc-500">Энэ ангилалд зочны эрх байхгүй</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {filtered.map((pass) => (
                <div
                  key={pass.id}
                  className="rounded-xl ring-1 ring-zinc-200 dark:ring-zinc-800 p-4 flex flex-col gap-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-medium truncate">{pass.visitor_name}</div>
                      <div className="text-xs text-zinc-500 mt-0.5">
                        {pass.phone ?? "—"} · {pass.plate_number ?? "Машингүй"}
                      </div>
                    </div>
                    <StatusBadge label={passStatusLabel(pass.status)} tone={passTone(pass.status)} />
                  </div>

                  <div className="text-xs text-zinc-500 space-y-0.5">
                    <div>
                      Эхлэх: {new Date(pass.valid_from).toLocaleString("mn-MN")}
                    </div>
                    <div>
                      Дуусах: {new Date(pass.valid_until).toLocaleString("mn-MN")}
                    </div>
                  </div>

                  {pass.status === "ACTIVE" && pass.qr_code ? (
                    <div className="flex flex-col items-center gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                      {expandedQr === pass.id ? (
                        <VisitorQrDisplay payload={pass.qr_code} />
                      ) : null}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setExpandedQr(expandedQr === pass.id ? null : pass.id)}
                      >
                        <QrCode className="size-3.5 mr-1" />
                        {expandedQr === pass.id ? "QR нуух" : "QR харуулах"}
                      </Button>
                    </div>
                  ) : null}

                  {pass.status === "ACTIVE" ? (
                    <form action={cancelAction}>
                      <input type="hidden" name="id" value={pass.id} />
                      <Button
                        type="submit"
                        variant="outline"
                        size="sm"
                        disabled={cancelPending}
                        className="w-full text-rose-600 hover:text-rose-700 dark:text-rose-400"
                      >
                        <Ban className="size-3.5 mr-1" />
                        Цуцлах
                      </Button>
                    </form>
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
