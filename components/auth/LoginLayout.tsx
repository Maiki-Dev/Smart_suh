import type { ReactNode } from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Bell, CreditCard, Wrench } from "lucide-react";
import { SmartSokhMark } from "@/components/brand/SmartSokhMark";
import { BrandLockup, BrandFooter, BRAND } from "@/components/brand/BrandIdentity";
import { LOGIN_PANEL, PRODUCT_HERO } from "@/lib/brand/product-content";
import { cn } from "@/lib/utils";

const LOGIN_BENEFIT_ICONS: LucideIcon[] = [CreditCard, Wrench, Bell];

type LoginBenefit = {
  title: string;
  detail: string;
};

function LoginBenefitList({ items }: { items: readonly LoginBenefit[] }) {
  return (
    <ul className="mt-10 space-y-0 divide-y divide-white/10 rounded-2xl border border-white/10 bg-black/10 backdrop-blur-[2px]">
      {items.map((item, index) => {
        const Icon = LOGIN_BENEFIT_ICONS[index] ?? Bell;
        return (
          <li key={item.title} className="flex gap-4 px-5 py-4">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/12 text-white">
              <Icon className="size-5" strokeWidth={2} />
            </span>
            <span className="min-w-0 pt-0.5">
              <span className="block text-[15px] font-medium leading-snug text-white">{item.title}</span>
              <span className="mt-1 block text-sm leading-snug text-emerald-100/75">{item.detail}</span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}

export function LoginBrandPanel({
  headline = LOGIN_PANEL.headline,
  subline = LOGIN_PANEL.subline,
  benefits = LOGIN_PANEL.benefits,
  footer = PRODUCT_HERO.footerSlogan,
  className,
}: {
  headline?: string;
  subline?: string;
  benefits?: readonly LoginBenefit[];
  footer?: string;
  className?: string;
}) {
  return (
    <aside
      className={cn(
        "relative flex min-h-full flex-col overflow-hidden px-8 py-10 text-white lg:px-12 lg:py-12 xl:px-14",
        "bg-[#065f46]",
        className,
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)
          `,
          backgroundSize: "56px 56px",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_20%_0%,rgba(255,255,255,0.12),transparent_55%)]"
      />

      <div className="relative flex items-center gap-4 border-b border-white/10 pb-8">
        <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-white/12 ring-1 ring-white/15">
          <SmartSokhMark className="size-8" variant="inverse" />
        </div>
        <BrandLockup variant="login-dark" />
      </div>

      <div className="relative flex flex-1 flex-col justify-center py-10 lg:py-12">
        <div className="max-w-md">
          <h1 className="text-[2rem] font-semibold leading-[1.15] tracking-[-0.03em] xl:text-[2.35rem]">
            {headline}
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-emerald-50/90">{subline}</p>
          <LoginBenefitList items={benefits} />
        </div>
      </div>

      <div className="relative shrink-0 border-t border-white/10 pt-6 text-sm text-emerald-100/75">
        <p>{footer}</p>
        <Link
          href="/about"
          className="mt-3 inline-flex items-center gap-1 font-medium text-white underline-offset-4 hover:underline"
        >
          Дэлгэрэнгүй танилцуулга
          <span aria-hidden>→</span>
        </Link>
        <p className="mt-4 text-emerald-100/45">© {BRAND.company}</p>
      </div>
    </aside>
  );
}

export function LoginFormShell({
  children,
  title,
  description,
  footer,
}: {
  children: ReactNode;
  title: string;
  description: string;
  footer?: ReactNode;
}) {
  return (
    <main className="relative flex min-h-full w-full flex-1 flex-col px-4 py-6 sm:px-8 sm:py-8 lg:px-12 lg:py-10 xl:px-16">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage: `
            linear-gradient(rgba(6,95,70,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(6,95,70,0.04) 1px, transparent 1px)
          `,
          backgroundSize: "56px 56px",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_80%_0%,rgba(6,95,70,0.06),transparent_50%)]"
      />

      <div className="relative mx-auto flex w-full max-w-[440px] min-h-full flex-col justify-center py-4">
        <div className="mb-5 hidden items-center gap-4 lg:flex">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/10">
            <SmartSokhMark className="size-7" />
          </div>
          <BrandLockup variant="login-light" />
        </div>
        <div className="mb-5 flex items-center gap-4 lg:hidden">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/10">
            <SmartSokhMark className="size-7" />
          </div>
          <BrandLockup variant="login-light" />
        </div>

        <div className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-[0_8px_30px_rgba(6,95,70,0.08)]">
          <div className="border-b border-border/80 bg-primary/[0.04] px-5 py-5 sm:px-8 sm:py-7">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">{BRAND.company}</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.02em] text-foreground">{title}</h2>
            <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">{description}</p>
          </div>

          <div className="px-5 py-5 sm:px-8 sm:py-7">{children}</div>

          {footer ? (
            <div className="border-t border-border/80 bg-muted/25 px-4 py-4 sm:px-8 sm:py-5">{footer}</div>
          ) : null}
        </div>
      </div>
    </main>
  );
}

export function LoginField({
  id,
  label,
  icon: Icon,
  hint,
  labelAction,
  error,
  children,
}: {
  id: string;
  label: string;
  icon: LucideIcon | React.ComponentType<any>;
  hint?: string;
  labelAction?: ReactNode;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <label htmlFor={id} className="text-[15px] font-medium text-foreground">
          {label}
        </label>
        {labelAction}
      </div>
      <div className="flex overflow-hidden rounded-xl border border-border bg-background shadow-sm transition-shadow focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-primary/15">
        <span className="flex w-12 shrink-0 items-center justify-center border-r border-border bg-muted/40 text-muted-foreground">
          <Icon className="size-[18px]" strokeWidth={2} />
        </span>
        <div className="min-w-0 flex-1 [&_input]:h-12 [&_input]:border-0 [&_input]:bg-transparent [&_input]:px-4 [&_input]:text-[15px] [&_input]:shadow-none [&_input]:ring-0 [&_input]:focus-visible:ring-0">
          {children}
        </div>
      </div>
      {hint && !error ? <p className="text-xs leading-relaxed text-muted-foreground">{hint}</p> : null}
      {error ? <p className="text-sm font-medium text-destructive">{error}</p> : null}
    </div>
  );
}

export function LoginHelpBox({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl border border-border/80 bg-muted/30 px-4 py-3.5 text-center text-sm leading-relaxed text-muted-foreground">
      {children}
    </div>
  );
}

export function LoginPageFrame({
  children,
  brandPanel,
}: {
  children: ReactNode;
  brandPanel?: ReactNode;
}) {
  return (
    <div
      data-login-page
      className="h-[100dvh] min-h-[100dvh] overflow-hidden bg-[#f8f7f4] lg:grid lg:grid-cols-2"
    >
      <div className="hidden h-full min-h-0 lg:block">
        {brandPanel ?? <LoginBrandPanel className="h-full" />}
      </div>
      <div className="flex h-full min-h-0 flex-col overflow-hidden">
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</div>
      </div>
    </div>
  );
}
