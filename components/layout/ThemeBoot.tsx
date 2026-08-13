"use client";

import { useEffect } from "react";

/** Applies saved theme preference on mount (client-only, no script tag). */
export function ThemeBoot() {
  useEffect(() => {
    try {
      const stored = localStorage.getItem("theme");
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      const useDark = stored ? stored === "dark" : prefersDark;
      document.documentElement.classList.toggle("dark", useDark);
    } catch {
      /* ignore */
    }
  }, []);
  return null;
}
