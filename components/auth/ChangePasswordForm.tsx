"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Building2, Lock, ShieldCheck, LogOut } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { changePasswordAction, type ChangePasswordActionState } from "@/app/change-password/actions";
import { logoutAction } from "@/app/login/actions";

const initialState: ChangePasswordActionState = {
  status: "idle",
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" disabled={pending} className="w-full">
      <ShieldCheck className="size-4" />
      {pending ? "Хадгалж байна..." : "Шинэ нууц үг хадгалах"}
    </Button>
  );
}

export function ChangePasswordForm() {
  const [state, formAction] = useActionState(changePasswordAction, initialState);

  return (
    <div className="min-h-screen w-full bg-zinc-50 flex flex-col lg:flex-row dark:bg-zinc-950">
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-emerald-700 via-emerald-600 to-teal-600 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.12),transparent_50%)]" />
        <div className="relative z-10 w-full flex flex-col justify-between p-12 xl:p-16">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-lg bg-white/15 backdrop-blur-sm flex items-center justify-center ring-1 ring-white/20">
              <Building2 className="size-5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-white font-semibold text-lg tracking-tight">Smart СӨХ</span>
              <span className="text-emerald-100 text-xs">Аюулгүй байдал</span>
            </div>
          </div>
          <div className="max-w-md">
            <h2 className="text-white text-3xl font-bold leading-tight mb-4">
              Эхний нэвтрэлт — нууц үгээ солино уу
            </h2>
            <p className="text-emerald-100 text-base leading-relaxed">
              Администратор өгсөн анхны нууц үгийг зөвхөн нэг удаа ашиглана. Өөрийн хувийн,
              хүндрэлтэй нууц үг үүсгэсний дараа системийг бүрэн ашиглах боломжтой.
            </p>
          </div>
          <p className="text-emerald-200/80 text-xs">© Smart СӨХ</p>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="size-5 text-emerald-600" />
                Шинэ нууц үг
              </CardTitle>
              <CardDescription>
                Хамгийн багадаа 8 тэмдэгт. Анхны нууц үгээ ашиглах боломжгүй.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {state.status === "error" && state.message ? (
                <Alert variant="destructive" className="mb-4">
                  <AlertTitle>Алдаа</AlertTitle>
                  <AlertDescription>{state.message}</AlertDescription>
                </Alert>
              ) : null}

              <form action={formAction} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password">Шинэ нууц үг</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={8}
                    placeholder="••••••••"
                  />
                  {state.fieldErrors?.password?.[0] ? (
                    <p className="text-xs text-rose-600">{state.fieldErrors.password[0]}</p>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Нууц үг давтах</Label>
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={8}
                    placeholder="••••••••"
                  />
                  {state.fieldErrors?.confirmPassword?.[0] ? (
                    <p className="text-xs text-rose-600">{state.fieldErrors.confirmPassword[0]}</p>
                  ) : null}
                </div>

                <SubmitButton />
              </form>
            </CardContent>
          </Card>

          <form action={logoutAction}>
            <Button type="submit" variant="ghost" className="w-full text-zinc-500">
              <LogOut className="size-4" />
              Гарах
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
