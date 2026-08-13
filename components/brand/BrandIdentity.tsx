import { cn } from "@/lib/utils";
import { PRODUCT_HERO } from "@/lib/brand/product-content";

export const BRAND = {
  company: "ITSafe",
  product: "Smart СӨХ",
  productTagline: "Smart СӨХ систем",
  productDescription: PRODUCT_HERO.title.replace("Smart СӨХ — ", ""),
} as const;

type BrandLockupProps = {
  variant: "login-dark" | "login-light" | "sidebar";
  subtitle?: string;
  className?: string;
};

export function BrandLockup({ variant, subtitle, className }: BrandLockupProps) {
  if (variant === "login-dark") {
    return (
      <div className={cn("min-w-0", className)}>
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-emerald-100/90">
          {BRAND.company}
        </p>
        <p className="mt-1 text-2xl font-semibold leading-tight tracking-[-0.02em] text-white">
          {BRAND.productTagline}
        </p>
        <p className="mt-1 text-sm text-emerald-100/75">{BRAND.productDescription}</p>
      </div>
    );
  }

  if (variant === "login-light") {
    return (
      <div className={cn("min-w-0", className)}>
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-primary">
          {BRAND.company}
        </p>
        <p className="mt-0.5 text-xl font-semibold leading-tight tracking-[-0.02em]">
          {BRAND.productTagline}
        </p>
        <p className="text-sm text-muted-foreground">{BRAND.productDescription}</p>
      </div>
    );
  }

  return (
    <div className={cn("min-w-0 flex-1", className)}>
      <p className="truncate text-[10px] font-semibold uppercase tracking-[0.12em] text-primary">
        {BRAND.company}
      </p>
      <p className="mt-0.5 truncate text-[13px] font-semibold leading-none tracking-[-0.02em] text-sidebar-foreground">
        {BRAND.product}
      </p>
      {subtitle ? (
        <p className="mt-1 truncate text-[11px] leading-none text-muted-foreground">{subtitle}</p>
      ) : null}
    </div>
  );
}

export function BrandFooter({ className }: { className?: string }) {
  return (
    <p className={cn("text-center text-xs text-muted-foreground", className)}>
      <span className="font-medium text-foreground/80">{BRAND.company}</span>
      {" · "}
      {BRAND.productTagline}
    </p>
  );
}
