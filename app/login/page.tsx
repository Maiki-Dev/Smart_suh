"use client";

import Link from "next/link";
import { use, useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Mail, Lock, AlertTriangle, Phone } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  LoginField,
  LoginFormShell,
  LoginHelpBox,
  LoginPageFrame,
} from "@/components/auth/LoginLayout";
import { BrandFooter } from "@/components/brand/BrandIdentity";
import { loginAction, type LoginActionState } from "./actions";

const initialState: LoginActionState = {
  status: "idle",
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      disabled={pending}
      className="h-12 w-full rounded-xl text-[15px] font-semibold shadow-sm"
    >
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
    <LoginPageFrame>
      <LoginFormShell
        title="Нэвтрэх хэсэг"
        description="Тавтай морилно уу! Манай платформ нь нэгдсэн SMART систем юм."
        footer={
          <div className="space-y-3 sm:space-y-4">
            <LoginHelpBox>
              Анх удаа нэвтэрч байгаа бол СӨХ-ын өгсөн и-мэйл эсвэл утасны дугаар, нууц үгийг ашиглана уу.
            </LoginHelpBox>
            <p className="text-center">
              <Link
                href="/about"
                className="text-sm font-medium text-primary underline-offset-4 hover:underline"
              >
                Системийн танилцуулга →
              </Link>
            </p>
            <BrandFooter />
          </div>
        }
      >
        {state.status === "error" && state.message ? (
          <Alert variant="destructive" className="mb-5 rounded-xl">
            <AlertTriangle className="size-4" />
            <AlertTitle className="text-sm font-semibold">Нэвтрэх амжилтгүй</AlertTitle>
            <AlertDescription className="text-sm">{state.message}</AlertDescription>
          </Alert>
        ) : null}

        <form action={formAction} className="space-y-5">
          <input type="hidden" name="from" value={from} />

          <LoginField
            id="identifier"
            label="И-мэйл эсвэл утасны дугаар"
            icon={(props: any) => (
              <div className="flex items-center gap-1">
                <Mail {...props} className="size-4" />
              </div>
            )}
            hint="Бүртгэлтэй и-мэйл эсвэл утасны дугаараа оруулна уу"
            error={state.fieldErrors?.identifier?.[0]}
          >
            <Input
              id="identifier"
              name="identifier"
              type="text"
              inputMode="text"
              autoComplete="username"
              autoFocus
              required
              placeholder="99112233"
            />
          </LoginField>

          <LoginField
            id="password"
            label="Нууц үг"
            icon={Lock}
            error={state.fieldErrors?.password?.[0]}
            labelAction={
              <Link href="#" className="text-sm font-medium text-primary hover:underline">
                Мартсан?
              </Link>
            }
          >
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              placeholder="Нууц үгээ оруулна уу"
            />
          </LoginField>

          <div className="pt-1">
            <SubmitButton />
          </div>
        </form>
      </LoginFormShell>
    </LoginPageFrame>
  );
}
