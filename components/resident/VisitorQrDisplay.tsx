"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

export function VisitorQrDisplay({ payload }: { payload: string }) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(payload, {
      width: 200,
      margin: 2,
      color: { dark: "#18181b", light: "#ffffff" },
    })
      .then((url) => {
        if (!cancelled) setDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) setError("QR код үүсгэхэд алдаа гарлаа");
      });
    return () => {
      cancelled = true;
    };
  }, [payload]);

  if (error) {
    return <p className="text-xs text-rose-600 dark:text-rose-400">{error}</p>;
  }

  if (!dataUrl) {
    return (
      <div className="size-[200px] rounded-lg bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
    );
  }

  return (
    <div className="flex flex-col items-center gap-2">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={dataUrl}
        alt="Зочны QR код"
        width={200}
        height={200}
        className="rounded-lg ring-1 ring-zinc-200 dark:ring-zinc-700"
      />
      <p className="text-[10px] text-zinc-500 font-mono break-all text-center max-w-[200px]">
        {payload}
      </p>
    </div>
  );
}
