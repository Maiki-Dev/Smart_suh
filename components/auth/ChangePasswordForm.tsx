"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { KeyRound, Lock, LogOut } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  LoginBrandPanel,
  LoginField,
  LoginFormShell,
  LoginPageFrame,
} from "@/components/auth/LoginLayout";
import { changePasswordAction, type ChangePasswordActionState } from "@/app/change-password/actions";
import { logoutAction } from "@/app/login/actions";

const initialState: ChangePasswordActionState = {
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
      {pending ? "Хадгалж байна..." : "Хадгалах"}
    </Button>
  );
}

export function ChangePasswordForm() {
  const [state, formAction] = useActionState(changePasswordAction, initialState);

  return (
    <LoginPageFrame
      brandPanel={
        <LoginBrandPanel
          className="min-h-screen"
          headline="Нууц үгээ солино уу"
          subline="Эхний нэвтрэлтэд СӨХ-ын өгсөн нууц үгийг солих шаардлагатай."
          benefits={[
            { title: "Хамгийн багадаа 8 тэмдэгт", detail: "Том, ойлгомжтой нууц үг сонгоно" },
            { title: "Өөрийн нууц үг", detail: "Анхны нууц үгийг дахин ашиглахгүй" },
            { title: "Аюулгүй нэвтрэлт", detail: "Хадгалсны дараа системийг бүрэн ашиглана" },
          ]}
          footer="Асуудал гарвал СӨХ-ын админтай холбогдоно уу."
        />
      }
    >
      <LoginFormShell
        title="Шинэ нууц үг"
        description="Шинэ нууц үгээ хоёр удаа оруулна уу."
        footer={
          <form action={logoutAction}>
            <Button
              type="submit"
              variant="ghost"
              className="h-10 w-full rounded-xl text-sm text-muted-foreground"
            >
              <LogOut className="size-4" />
              Гарах
            </Button>
          </form>
        }
      >
        {state.status === "error" && state.message ? (
          <Alert variant="destructive" className="mb-5 rounded-xl">
            <AlertTitle className="text-sm font-semibold">Алдаа</AlertTitle>
            <AlertDescription className="text-sm">{state.message}</AlertDescription>
          </Alert>
        ) : null}

        <form action={formAction} className="space-y-5">
          <LoginField
            id="password"
            label="Шинэ нууц үг"
            icon={Lock}
            hint="Хамгийн багадаа 8 тэмдэгт"
            error={state.fieldErrors?.password?.[0]}
          >
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              placeholder="Шинэ нууц үг"
            />
          </LoginField>

          <LoginField
            id="confirmPassword"
            label="Давтах"
            icon={KeyRound}
            error={state.fieldErrors?.confirmPassword?.[0]}
          >
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              placeholder="Дахин оруулна уу"
            />
          </LoginField>

          <SubmitButton />
        </form>
      </LoginFormShell>
    </LoginPageFrame>
  );
}
