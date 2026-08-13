"use client";

import type { ReactNode } from "react";
import { useActionState } from "react";
import { Lock, User } from "lucide-react";
import type { User as AppUser } from "@/types";
import {
  changeResidentPasswordAction,
  updateResidentProfileAction,
  type ResidentProfileActionState,
} from "@/app/resident/profile/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useActionToast } from "@/lib/hooks/use-action-toast";
import { cn } from "@/lib/utils";

const initialState: ResidentProfileActionState = { status: "idle" };

type TabKey = "profile" | "password";

function ProfileForm({
  action,
  successMessage,
  children,
  className,
}: {
  action: (_prev: ResidentProfileActionState, formData: FormData) => Promise<ResidentProfileActionState>;
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

export function ResidentProfilePanel({
  user,
  apartmentLabel,
  initialTab = "profile",
}: {
  user: Omit<AppUser, "password_hash">;
  apartmentLabel: string;
  initialTab?: TabKey;
}) {
  const tab = initialTab === "password" ? "password" : "profile";

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div className="flex flex-wrap gap-2">
        <TabLink href="/resident/profile?tab=profile" active={tab === "profile"} icon={User} label="Профайл" />
        <TabLink href="/resident/profile?tab=password" active={tab === "password"} icon={Lock} label="Нууц үг" />
      </div>

      {tab === "profile" ? (
        <Card>
          <CardHeader>
            <CardTitle>Миний профайл</CardTitle>
            <CardDescription>Нэр, утас зэрэг хувийн мэдээлэл</CardDescription>
          </CardHeader>
          <CardContent>
            <ProfileForm
              action={updateResidentProfileAction}
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
                <Label>Орон сууц</Label>
                <Input value={apartmentLabel} readOnly disabled className="opacity-70" />
              </div>
            </ProfileForm>
          </CardContent>
        </Card>
      ) : null}

      {tab === "password" ? (
        <Card>
          <CardHeader>
            <CardTitle>Нууц үг солих</CardTitle>
            <CardDescription>Аюулгүй байдлын үүднээс хүндрэлтэй, өөрөө мэдэх нууц үг ашиглана уу</CardDescription>
          </CardHeader>
          <CardContent>
            <ProfileForm
              action={changeResidentPasswordAction}
              successMessage="Нууц үг амжилттай солигдлоо"
              className="max-w-md flex flex-col gap-4"
            >
              <div className="flex flex-col gap-2">
                <Label htmlFor="current_password">Одоогийн нууц үг</Label>
                <Input
                  id="current_password"
                  name="current_password"
                  type="password"
                  required
                  autoComplete="current-password"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="new_password">Шинэ нууц үг</Label>
                <Input
                  id="new_password"
                  name="new_password"
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="confirm_password">Шинэ нууц үг давтах</Label>
                <Input
                  id="confirm_password"
                  name="confirm_password"
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
              </div>
            </ProfileForm>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function TabLink({
  href,
  active,
  icon: Icon,
  label,
}: {
  href: string;
  active: boolean;
  icon: typeof User;
  label: string;
}) {
  return (
    <a
      href={href}
      className={cn(
        "inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-sm font-medium transition-colors",
        active
          ? "border-primary bg-primary/10 text-primary"
          : "border-border bg-background text-muted-foreground hover:bg-muted",
      )}
    >
      <Icon className="size-4" />
      {label}
    </a>
  );
}
