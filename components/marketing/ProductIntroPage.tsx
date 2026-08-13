import Link from "next/link";
import { SmartSokhMark } from "@/components/brand/SmartSokhMark";
import { BrandLockup, BRAND } from "@/components/brand/BrandIdentity";
import { PRODUCT_HERO, PRODUCT_SECTIONS } from "@/lib/brand/product-content";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ProductIntroPage() {
  return (
    <div className="min-h-screen bg-[#f7f6f3]">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/10">
              <SmartSokhMark className="size-6" />
            </div>
            <BrandLockup variant="login-light" />
          </div>
          <Link href="/login" className={cn(buttonVariants())}>
            Нэвтрэх
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-10 sm:py-14">
        <section className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-10">
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-primary">{BRAND.company}</p>
          <h1 className="mt-3 text-3xl font-semibold leading-tight tracking-[-0.02em] sm:text-4xl">
            {PRODUCT_HERO.title}
          </h1>
          <p className="mt-4 text-xl font-medium text-primary">{PRODUCT_HERO.tagline}</p>
          <p className="mt-6 text-[17px] leading-relaxed text-muted-foreground">{PRODUCT_HERO.intro}</p>
          <p className="mt-4 text-[17px] leading-relaxed text-muted-foreground">{PRODUCT_HERO.summary}</p>
        </section>

        <div className="mt-8 space-y-6">
          {PRODUCT_SECTIONS.map((section) => (
            <section
              key={section.title}
              className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8"
            >
              <h2 className="text-xl font-semibold leading-snug tracking-[-0.01em]">
                <span className="mr-2">{section.icon}</span>
                {section.title}
              </h2>
              {section.lead ? (
                <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">{section.lead}</p>
              ) : null}
              {section.body.map((paragraph) => (
                <p key={paragraph} className="mt-4 text-[15px] leading-relaxed text-muted-foreground">
                  {paragraph}
                </p>
              ))}
              {section.bullets ? (
                <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                  {section.bullets.map((item) => (
                    <li
                      key={item}
                      className="rounded-lg bg-muted/50 px-3 py-2 text-[15px] leading-snug text-foreground"
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              ) : null}
              {section.example ? (
                <div className="mt-4 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-[15px] leading-relaxed whitespace-pre-line text-foreground">
                  {section.example}
                </div>
              ) : null}
              {section.note ? (
                <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">{section.note}</p>
              ) : null}
            </section>
          ))}
        </div>

        <section className="mt-10 rounded-2xl border border-primary/20 bg-[linear-gradient(165deg,#065f46_0%,#047857_55%,#064e3b_100%)] p-8 text-center text-white sm:p-10">
          <p className="text-lg font-semibold">{PRODUCT_HERO.footerSlogan}</p>
          <p className="mt-3 text-emerald-100/90">{PRODUCT_HERO.closing}</p>
          <Link
            href="/login"
            className={cn(
              buttonVariants({ size: "lg" }),
              "mt-8 h-11 bg-white text-[#065f46] hover:bg-white/90",
            )}
          >
            Системд нэвтрэх
          </Link>
          <p className="mt-6 text-sm text-emerald-100/60">© {BRAND.company}</p>
        </section>
      </main>
    </div>
  );
}
