"use client";

import { useEffect } from "react";

export function ThemeInitScript() {
  useEffect(() => {
    try {
      const stored = localStorage.getItem("theme");
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      const useDark = stored ? stored === "dark" : prefersDark;
      const root = document.documentElement;
      if (useDark) root.classList.add("dark");
      else root.classList.remove("dark");
    } catch {}
  }, []);
  return null;
}
