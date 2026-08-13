import { SmartSokhMark } from "@/components/brand/SmartSokhMark";
import { BrandLockup, BRAND } from "@/components/brand/BrandIdentity";
import { cn } from "@/lib/utils";

export function SidebarBrandHeader({
  subtitle,
  href,
  className,
}: {
  subtitle: string;
  href?: string;
  className?: string;
}) {
  const content = (
    <>
      <div className="flex size-8 shrink-0 items-center justify-center rounded-[10px] bg-foreground/[0.04] text-foreground dark:bg-foreground/[0.06]">
        <SmartSokhMark className="size-[1.125rem]" />
      </div>
      <BrandLockup variant="sidebar" subtitle={subtitle} />
    </>
  );

  const sharedClassName = cn(
    "flex h-[3.75rem] shrink-0 items-center gap-3 border-b border-sidebar-border px-4",
    href &&
      "group transition-[background-color,color] duration-150 hover:bg-sidebar-accent/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
    className,
  );

  const ariaLabel = `${BRAND.company} · ${BRAND.product} — ${subtitle}`;

  if (href) {
    return (
      <a href={href} className={sharedClassName} aria-label={ariaLabel}>
        {content}
      </a>
    );
  }

  return <div className={sharedClassName}>{content}</div>;
}
