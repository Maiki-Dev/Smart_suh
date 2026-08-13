import { cn } from "@/lib/utils";

type SmartSokhMarkProps = {
  className?: string;
  /** Light sidebar (default) or on dark/colored surfaces. */
  variant?: "default" | "inverse";
};

/**
 * Custom Smart СӨХ mark — stepped building profile.
 * Asymmetric floor stack + single lit window; reads clearly at 16–32px.
 */
export function SmartSokhMark({ className, variant = "default" }: SmartSokhMarkProps) {
  if (variant === "inverse") {
    return (
      <svg
        viewBox="0 0 20 20"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={cn("size-5 shrink-0", className)}
        aria-hidden
      >
        <path
          d="M2 14.5h16a.5.5 0 0 1 .5.5V19a.5.5 0 0 1-.5.5H2a.5.5 0 0 1-.5-.5V15a.5.5 0 0 1 .5-.5Z"
          fill="white"
          fillOpacity={0.22}
        />
        <path
          d="M4 8.5h12a.5.5 0 0 1 .5.5v5a.5.5 0 0 1-.5.5H4a.5.5 0 0 1-.5-.5V9a.5.5 0 0 1 .5-.5Z"
          fill="white"
          fillOpacity={0.92}
        />
        <path
          d="M6 3.5h8a.5.5 0 0 1 .5.5V8a.5.5 0 0 1-.5.5H6a.5.5 0 0 1-.5-.5V4a.5.5 0 0 1 .5-.5Z"
          fill="white"
          fillOpacity={0.52}
        />
        <rect x="8.25" y="10.25" width="3.5" height="2.25" rx="0.5" fill="#047857" />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("size-5 shrink-0", className)}
      aria-hidden
    >
      <path
        d="M2 14.5h16a.5.5 0 0 1 .5.5V19a.5.5 0 0 1-.5.5H2a.5.5 0 0 1-.5-.5V15a.5.5 0 0 1 .5-.5Z"
        className="fill-foreground/20"
      />
      <path
        d="M4 8.5h12a.5.5 0 0 1 .5.5v5a.5.5 0 0 1-.5.5H4a.5.5 0 0 1-.5-.5V9a.5.5 0 0 1 .5-.5Z"
        className="fill-primary"
      />
      <path
        d="M6 3.5h8a.5.5 0 0 1 .5.5V8a.5.5 0 0 1-.5.5H6a.5.5 0 0 1-.5-.5V4a.5.5 0 0 1 .5-.5Z"
        className="fill-foreground/55"
      />
      <rect x="8.25" y="10.25" width="3.5" height="2.25" rx="0.5" className="fill-primary-foreground" />
    </svg>
  );
}
