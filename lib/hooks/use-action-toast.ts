"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";

export type ActionFeedbackState = {
  status: "idle" | "success" | "error";
  message?: string;
};

export function notifyActionResult(
  result: ActionFeedbackState,
  fallbackSuccess = "Амжилттай",
) {
  if (result.status === "success") {
    toast.success(result.message ?? fallbackSuccess);
    return true;
  }
  if (result.status === "error" && result.message) {
    toast.error(result.message);
    return false;
  }
  return false;
}

export function useActionToast(
  state: ActionFeedbackState,
  options?: {
    onSuccess?: () => void;
    successMessage?: string;
  },
) {
  const handledKey = useRef<string | null>(null);
  const onSuccess = options?.onSuccess;
  const successMessage = options?.successMessage;

  useEffect(() => {
    if (state.status === "idle") return;

    const key = `${state.status}:${state.message ?? ""}`;
    if (handledKey.current === key) return;
    handledKey.current = key;

    if (state.status === "success") {
      toast.success(state.message ?? successMessage ?? "Амжилттай хадгалагдлаа");
      onSuccess?.();
    } else if (state.status === "error" && state.message) {
      toast.error(state.message);
    }
  }, [state.status, state.message, onSuccess, successMessage]);
}
