"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { ApartmentTwinDetail } from "@/lib/digital-twin/types";
import { aptHealthStatusLabel } from "@/lib/digital-twin/labels";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatMNT } from "@/lib/admin/format";
import { maintenancePriorityLabel } from "@/lib/admin/format";
import { X, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

export function DigitalTwinApartmentPanel({
  apartmentId,
  onClose,
}: {
  apartmentId: string | null;
  onClose: () => void;
}) {
  const [detail, setDetail] = useState<ApartmentTwinDetail | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!apartmentId) {
      setDetail(null);
      return;
    }
    setLoading(true);
    fetch(`/api/admin/digital-twin/apartment/${apartmentId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setDetail(d))
      .finally(() => setLoading(false));
  }, [apartmentId]);

  if (!apartmentId) {
    return (
      <Card className="hidden lg:block">
        <CardContent className="flex h-64 items-center justify-center pt-6">
          <p className="text-sm text-muted-foreground">Орон сууц сонгоно уу</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="fixed inset-x-0 bottom-0 z-40 max-h-[70vh] overflow-y-auto rounded-b-none lg:static lg:max-h-[calc(100vh-8rem)] lg:rounded-b-lg">
      <CardHeader className="flex flex-row items-start justify-between pb-2">
        <div>
          <CardTitle className="text-base">
            {loading ? "..." : detail?.apartment_number ?? "Орон сууц"}
          </CardTitle>
          {detail ? (
            <p className="text-xs text-muted-foreground">{detail.building_name}</p>
          ) : null}
        </div>
        <Button variant="ghost" size="icon" className="size-7 shrink-0" onClick={onClose}>
          <X className="size-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4 pb-6">
        {loading ? (
          <p className="text-sm text-muted-foreground">Ачааллаж байна...</p>
        ) : !detail ? (
          <p className="text-sm text-muted-foreground">Мэдээлэл олдсонгүй</p>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <Badge
                className={cn(
                  detail.status === "CRITICAL" && "bg-red-500",
                  detail.status === "WARNING" && "bg-amber-400 text-amber-950",
                  detail.status === "HEALTHY" && "bg-emerald-500",
                  detail.status === "INACTIVE" && "bg-muted text-muted-foreground",
                )}
              >
                {aptHealthStatusLabel(detail.status)} · {detail.health_score}%
              </Badge>
            </div>

            <Section title="Ерөнхий">
              <Row label="Оршин суугч" value={String(detail.resident_count)} />
              <Row
                label="Төлбөр"
                value={
                  detail.current_debt > 0
                    ? `${formatMNT(detail.current_debt)} (${detail.payment_status})`
                    : detail.payment_status
                }
                alert={detail.payment_status === "OVERDUE"}
              />
              {detail.overdue_days != null && detail.overdue_days > 0 ? (
                <Row label="Хугацаа хэтэрсэн" value={`${detail.overdue_days} хоног`} alert />
              ) : null}
              <Row label="Машин" value={String(detail.vehicle_count)} />
              <Row label="Нээлттэй асуудал" value={String(detail.open_issue_count)} />
              <Row label="Incident" value={String(detail.active_incidents.length)} />
            </Section>

            {detail.residents.length > 0 ? (
              <Section title="Оршин суугч">
                {detail.residents.map((r) => (
                  <p key={r.id} className="text-sm">
                    {r.last_name} {r.first_name}
                    {r.is_owner ? " (эзэмшигч)" : ""}
                  </p>
                ))}
              </Section>
            ) : null}

            {detail.vehicles.length > 0 ? (
              <Section title="Зогсоол">
                {detail.vehicles.map((v) => (
                  <p key={v.id} className="text-sm">
                    {v.plate_number}{" "}
                    <span className="text-muted-foreground">
                      {v.gate_access && v.active ? "ACTIVE" : "SUSPENDED"}
                    </span>
                  </p>
                ))}
              </Section>
            ) : null}

            {detail.open_issues.length > 0 ? (
              <Section title="Асуудал">
                {detail.open_issues.map((issue) => (
                  <Link
                    key={issue.id}
                    href={`/admin/maintenance/${issue.id}`}
                    className="flex items-center justify-between rounded border px-2 py-1.5 text-sm hover:bg-muted"
                  >
                    <span className="truncate">{issue.title}</span>
                    <span className="ml-2 shrink-0 text-xs text-muted-foreground">
                      {maintenancePriorityLabel(issue.priority)}
                    </span>
                  </Link>
                ))}
              </Section>
            ) : null}

            {detail.active_incidents.length > 0 ? (
              <Section title="Incidents">
                {detail.active_incidents.map((inc) => (
                  <Link
                    key={inc.id}
                    href={`/admin/incidents/${inc.id}`}
                    className="flex items-center justify-between rounded border px-2 py-1.5 text-sm hover:bg-muted"
                  >
                    <span>{inc.incident_number}</span>
                    <ExternalLink className="size-3 text-muted-foreground" />
                  </Link>
                ))}
              </Section>
            ) : null}

            <Link
              href={`/admin/apartments/${detail.id}`}
              className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              Бүрэн профайл <ExternalLink className="size-3" />
            </Link>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {title}
      </p>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function Row({
  label,
  value,
  alert,
}: {
  label: string;
  value: string;
  alert?: boolean;
}) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("font-medium", alert && "text-red-500")}>{value}</span>
    </div>
  );
}
