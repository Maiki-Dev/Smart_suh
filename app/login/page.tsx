"use client";

import Link from "next/link";
import { use, useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Building2, Mail, Lock, LogIn, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { loginAction, type LoginActionState } from "./actions";

const initialState: LoginActionState = {
  status: "idle",
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      size="lg"
      disabled={pending}
      className="w-full"
    >
      <LogIn className="size-4" />
      {pending ? "Нэвтрэж байна..." : "Нэвтрэх"}
    </Button>
  );
}

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const [state, formAction] = useActionState(loginAction, initialState);
  const { from: fromParam } = use(searchParams);
  const from = fromParam || "";

  return (
    <div className="min-h-screen w-full bg-zinc-50 flex flex-col lg:flex-row">
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-emerald-700 via-emerald-600 to-teal-600 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.12),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(255,255,255,0.08),transparent_50%)]" />
        <div className="relative z-10 w-full flex flex-col justify-between p-12 xl:p-16">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-lg bg-white/15 backdrop-blur-sm flex items-center justify-center ring-1 ring-white/20">
              <Building2 className="size-5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-white font-semibold text-lg tracking-tight">
                Smart СӨХ
              </span>
              <span className="text-emerald-100 text-xs">
                Удирдлагын систем
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-8 max-w-md">
            <div className="flex flex-col gap-4">
              <h2 className="text-white text-4xl xl:text-5xl font-bold leading-[1.1] tracking-tight">
                СӨХ-ын удирдлага<br />
                нэг дороос.
              </h2>
              <p className="text-emerald-100 text-base xl:text-lg leading-relaxed max-w-sm">
                Оршин сууцны менежмент, төлбөрийн бодлого, машинын нэвтрэлт, засварын хүсэлт зэрэг бүх үйлдлүүдийг хялбархан удирда.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-4">
              {[
                { label: "Орон сууц", value: "1+" },
                { label: "Сарын төлбөр", value: "98%" },
                { label: "Хянасан систем", value: "24/7" },
              ].map((stat) => (
                <div key={stat.label} className="flex flex-col gap-1">
                  <div className="text-white text-2xl font-semibold">
                    {stat.value}
                  </div>
                  <div className="text-emerald-100/80 text-xs uppercase tracking-wider">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="text-emerald-100/60 text-xs">
            © 2026 Smart СӨХ. Анхбаяр Золтуяа хөгжүүлсэн.
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-4 sm:p-8 py-12">
        <div className="w-full max-w-md flex flex-col gap-8">
          <div className="lg:hidden flex items-center gap-3 mb-2">
            <div className="size-9 rounded-lg bg-emerald-600 flex items-center justify-center">
              <Building2 className="size-4 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="font-semibold text-base tracking-tight">
                Smart СӨХ
              </span>
            </div>
          </div>

          <Card className="border-zinc-200 shadow-sm">
            <CardHeader className="gap-1 pb-6">
              <CardTitle className="text-2xl font-semibold tracking-tight">
                Нэвтрэх
              </CardTitle>
              <CardDescription className="text-sm">
                И-мэйл, нууц үгээ оруулж системд нэвтрэнэ үү.
              </CardDescription>
            </CardHeader>

            <CardContent>
              {state.status === "error" && state.message && (
                <Alert variant="destructive" className="mb-5">
                  <AlertTriangle className="size-4" />
                  <AlertTitle className="text-sm font-medium">
                    Алдаа
                  </AlertTitle>
                  <AlertDescription className="text-sm">
                    {state.message}
                  </AlertDescription>
                </Alert>
              )}

              <form action={formAction} className="flex flex-col gap-4">
                <input type="hidden" name="from" value={from} />

                <div className="flex flex-col gap-2">
                  <Label htmlFor="email" className="text-xs uppercase tracking-wider text-muted-foreground">
                    И-мэйл
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="name@example.com"
                      autoComplete="email"
                      autoFocus
                      required
                      className="h-9 pl-8 text-sm"
                    />
                  </div>
                  {state.fieldErrors?.email && (
                    <p className="text-xs text-destructive">{state.fieldErrors.email[0]}</p>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-xs uppercase tracking-wider text-muted-foreground">
                      Нууц үг
                    </Label>
                    <Link
                      href="#"
                      className="text-xs text-primary hover:underline underline-offset-4"
                    >
                      Нууц үг мартсан?
                    </Link>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      placeholder="••••••••"
                      autoComplete="current-password"
                      required
                      className="h-9 pl-8 text-sm"
                    />
                  </div>
                  {state.fieldErrors?.password && (
                    <p className="text-xs text-destructive">{state.fieldErrors.password[0]}</p>
                  )}
                </div>

                <div className="pt-2">
                  <SubmitButton />
                </div>
              </form>

              {/* <div className="mt-6 pt-5 border-t border-zinc-100">
                <div className="space-y-1.5">
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
                    Туршилтын хаягууд
                  </p>
                  <div className="grid grid-cols-1 gap-1 text-xs text-muted-foreground font-mono">
                    <div>super@example.com · superadmin123</div>
                    <div>admin@abcresidence.mn · admin123</div>
                    <div>operator@abcresidence.mn · operator123</div>
                    <div>bat.erdeneb@example.mn · resident123</div>
                  </div>
                </div>
              </div> */}
            </CardContent>
          </Card>

          <p className="text-center text-xs text-muted-foreground">
            Smart СӨХ системд нэвтэрч, оршин сууцны удирдлагыг хялбархан хийнэ.
          </p>
        </div>
      </div>
    </div>
  );
}
