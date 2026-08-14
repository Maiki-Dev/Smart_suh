"use client";

import type { ReactNode } from "react";
import { useActionState, useState } from "react";
import {
  Building2,
  Shield,
  User,
  Lock,
  Info,
  LogOut,
} from "lucide-react";
import type { Organization, User as AppUser } from "@/types";
import type { OrganizationSettings } from "@/lib/organization/settings";
import {
  CURRENCY_OPTIONS,
  LANGUAGE_OPTIONS,
  TIMEZONE_OPTIONS,
} from "@/lib/organization/settings";
import {
  changePasswordAction,
  updateOrganizationProfileAction,
  updateOrganizationSettingsAction,
  updateProfileAction,
  type SettingsActionState,
} from "@/app/admin/settings/actions";
import { logoutAction } from "@/app/login/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { erpSelectClassName } from "@/components/ui/erp-dialog";
import { useActionToast } from "@/lib/hooks/use-action-toast";
import { roleLabel } from "@/lib/admin/format";
import { formatDateTimeMn } from "@/lib/format/datetime";
import { cn } from "@/lib/utils";

const initialState: SettingsActionState = { status: "idle" };

type TabKey = "organization" | "system" | "profile" | "password";

const TABS: { key: TabKey; label: string; icon: typeof Building2 }[] = [
  { key: "organization", label: "Байгууллага", icon: Building2 },
  { key: "system", label: "Систем", icon: Shield },
  { key: "profile", label: "Профайл", icon: User },
  { key: "password", label: "Нууц үг", icon: Lock },
];

function SettingsForm({
  action,
  successMessage,
  children,
  className,
}: {
  action: (_prev: SettingsActionState, formData: FormData) => Promise<SettingsActionState>;
  successMessage: string;
  children: ReactNode;
  className?: string;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);

  useActionToast(state, { successMessage });

  return (
    <form action={formAction} className={cn("flex flex-col gap-4", className)}>
      {children}
      <div className="flex justify-end pt-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Хадгалж байна..." : "Хадгалах"}
        </Button>
      </div>
    </form>
  );
}

export function SettingsPanel({
  organization,
  settings,
  user,
  canManageOrganization,
}: {
  organization: Organization;
  settings: OrganizationSettings;
  user: Omit<AppUser, 'password_hash'>;
  canManageOrganization: boolean;
}) {
  const [tab, setTab] = useState<TabKey>("organization");

  const visibleTabs = TABS.filter((item) => {
    if (!canManageOrganization && (item.key === "organization" || item.key === "system")) {
      return false;
    }
    return true;
  });

  const activeTab = visibleTabs.some((t) => t.key === tab) ? tab : visibleTabs[0]?.key ?? "profile";

  return (
    <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
      <Card className="h-fit lg:sticky lg:top-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Тохиргоо</CardTitle>
          <CardDescription>Байгууллага, систем, профайл</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-1 p-2 pt-0">
          {visibleTabs.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setTab(item.key)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors text-left",
                  active
                    ? "bg-muted font-medium text-foreground"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                )}
              >
                <Icon className="size-4 shrink-0 text-muted-foreground" />
                {item.label}
              </button>
            );
          })}
        </CardContent>
      </Card>

      <div className="flex flex-col gap-6">
        {!canManageOrganization ? (
          <div className="rounded-xl border border-amber-200/80 bg-amber-50/70 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200 flex gap-2">
            <Info className="size-4 shrink-0 mt-0.5" />
            <span>
              Таны эрх ({roleLabel(user.role)}) зөвхөн профайл болон нууц үгийг засах боломжтой.
              Байгууллагын тохиргоог СӨХ админ засна.
            </span>
          </div>
        ) : null}

        {activeTab === "organization" && canManageOrganization ? (
          <Card>
            <CardHeader>
              <CardTitle>Байгууллагын мэдээлэл</CardTitle>
              <CardDescription>СӨХ-ын албан ёсны мэдээлэл, холбоо барих</CardDescription>
            </CardHeader>
            <CardContent>
              <SettingsForm
                action={updateOrganizationProfileAction}
                successMessage="Байгууллагын мэдээлэл хадгалагдлаа"
                className="grid gap-4 sm:grid-cols-2"
              >
                <div className="sm:col-span-2 flex flex-col gap-2">
                  <Label htmlFor="name">Байгууллагын нэр</Label>
                  <Input id="name" name="name" defaultValue={organization.name} required />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="registration_number">Регистрийн дугаар</Label>
                  <Input
                    id="registration_number"
                    name="registration_number"
                    defaultValue={organization.registration_number ?? ""}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="phone">Утас</Label>
                  <Input id="phone" name="phone" defaultValue={organization.phone ?? ""} />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="email">И-мэйл</Label>
                  <Input id="email" name="email" type="email" defaultValue={organization.email ?? ""} />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="logo_url">Лого URL</Label>
                  <Input id="logo_url" name="logo_url" defaultValue={organization.logo_url ?? ""} />
                </div>
                <div className="sm:col-span-2 flex flex-col gap-2">
                  <Label htmlFor="address">Хаяг</Label>
                  <Input id="address" name="address" defaultValue={organization.address ?? ""} />
                </div>
                <div className="sm:col-span-2 rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                  Сүүлд шинэчилсэн: {formatDateTimeMn(organization.updated_at)}
                </div>
              </SettingsForm>
            </CardContent>
          </Card>
        ) : null}

        {activeTab === "system" && canManageOrganization ? (
          <Card>
            <CardHeader>
              <CardTitle>Системийн тохиргоо</CardTitle>
              <CardDescription>Зогсоол, нэхэмжлэл, зочны эрхийн үндсэн дүрэм</CardDescription>
            </CardHeader>
            <CardContent>
              <SettingsForm
                action={updateOrganizationSettingsAction}
                successMessage="Системийн тохиргоо хадгалагдлаа"
                className="grid gap-4 sm:grid-cols-2"
              >
                <div className="flex flex-col gap-2">
                  <Label htmlFor="timezone">Цагийн бүс</Label>
                  <select id="timezone" name="timezone" defaultValue={settings.timezone} className={erpSelectClassName}>
                    {TIMEZONE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="currency">Валют</Label>
                  <select id="currency" name="currency" defaultValue={settings.currency} className={erpSelectClassName}>
                    {CURRENCY_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="language">Хэл</Label>
                  <select id="language" name="language" defaultValue={settings.language} className={erpSelectClassName}>
                    {LANGUAGE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="gate_unpaid_months">Зогсоол хаах (төлөгдөөгүй сар)</Label>
                  <Input
                    id="gate_unpaid_months"
                    name="gate_unpaid_months"
                    type="number"
                    min={1}
                    max={12}
                    defaultValue={settings.gate_unpaid_months}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Дараалан төлөгдөөгүй сар энэ тоонд хүрэхэд машины зогсоолын эрх автоматаар хаагдана.
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="invoice_due_days">Нэхэмжлэлийн хугацаа (хоног)</Label>
                  <Input
                    id="invoice_due_days"
                    name="invoice_due_days"
                    type="number"
                    min={1}
                    max={60}
                    defaultValue={settings.invoice_due_days}
                    required
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="visitor_default_hours">Зочны эрх (цаг)</Label>
                  <Input
                    id="visitor_default_hours"
                    name="visitor_default_hours"
                    type="number"
                    min={1}
                    max={168}
                    defaultValue={settings.visitor_default_hours}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Оршин суугч шинэ зочны эрх үүсгэхэд санал болгох хугацаа.
                  </p>
                </div>
              </SettingsForm>
            </CardContent>
          </Card>
        ) : null}

        {activeTab === "profile" ? (
          <Card>
            <CardHeader>
              <CardTitle>Миний профайл</CardTitle>
              <CardDescription>Нэр, утас зэрэг хувийн мэдээлэл</CardDescription>
            </CardHeader>
            <CardContent>
              <SettingsForm
                action={updateProfileAction}
                successMessage="Профайл шинэчлэгдлээ"
                className="grid gap-4 sm:grid-cols-2"
              >
                <div className="flex flex-col gap-2">
                  <Label htmlFor="first_name">Нэр</Label>
                  <Input id="first_name" name="first_name" defaultValue={user.first_name} required />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="last_name">Овог</Label>
                  <Input id="last_name" name="last_name" defaultValue={user.last_name} required />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="profile_phone">Утас</Label>
                  <Input id="profile_phone" name="phone" defaultValue={user.phone ?? ""} />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="profile_email">И-мэйл</Label>
                  <Input id="profile_email" value={user.email} readOnly disabled className="opacity-70" />
                </div>
                <div className="sm:col-span-2 flex flex-col gap-2">
                  <Label>Эрх</Label>
                  <Input value={roleLabel(user.role)} readOnly disabled className="opacity-70" />
                </div>
              </SettingsForm>
            </CardContent>
          </Card>
        ) : null}

        {activeTab === "password" ? (
          <Card>
            <CardHeader>
              <CardTitle>Нууц үг солих</CardTitle>
              <CardDescription>Аюулгүй байдлын үүднээс тогтмол солино уу</CardDescription>
            </CardHeader>
            <CardContent>
              <SettingsForm
                action={changePasswordAction}
                successMessage="Нууц үг амжилттай солигдлоо"
                className="max-w-md flex flex-col gap-4"
              >
                <div className="flex flex-col gap-2">
                  <Label htmlFor="current_password">Одоогийн нууц үг</Label>
                  <Input id="current_password" name="current_password" type="password" required autoComplete="current-password" />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="new_password">Шинэ нууц үг</Label>
                  <Input id="new_password" name="new_password" type="password" required autoComplete="new-password" />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="confirm_password">Шинэ нууц үг давтах</Label>
                  <Input id="confirm_password" name="confirm_password" type="password" required autoComplete="new-password" />
                </div>
              </SettingsForm>
            </CardContent>
          </Card>
        ) : null}

        <Card className="border-destructive/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LogOut className="size-4 text-destructive" />
              Сесс
            </CardTitle>
            <CardDescription>
              Системээс гарна. Дахин нэвтрэхдээ нууц үгээ оруулах шаардлагатай.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              action={logoutAction}
              onSubmit={(e) => {
                const ok = window.confirm("Та системээс гарахдаа итгэлтэй байна уу?");
                if (!ok) e.preventDefault();
              }}
              className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="text-sm text-muted-foreground">
                Одоо{" "}
                <span className="font-medium text-foreground">{user.email}</span>{" "}
                <span className="ml-1 inline-flex items-center rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase text-muted-foreground">
                  {roleLabel(user.role)}
                </span>{" "}
                эрхээр нэвтэрсэн байна.
              </div>
              <Button type="submit" variant="destructive" className="w-full sm:w-auto">
                <LogOut className="mr-2 size-4" />
                Системээс гарах
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
