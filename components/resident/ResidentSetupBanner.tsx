import { AlertCircle, Link2 } from "lucide-react";

type SetupReason = "no_record" | "unlinked_account";

export function ResidentSetupBanner({ reason }: { reason: SetupReason }) {
  return (
    <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-4 dark:border-amber-500/20 dark:bg-amber-500/5">
      <div className="flex gap-3">
        <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
          <AlertCircle className="size-4" />
        </div>
        <div className="min-w-0 flex-1 space-y-3">
          <div>
            <h2 className="text-sm font-semibold text-amber-950 dark:text-amber-100">
              Орон сууц холбоогүй байна
            </h2>
            <p className="mt-1 text-sm text-amber-900/80 dark:text-amber-200/80">
              {reason === "unlinked_account"
                ? "Таны оршин суугчийн бүртгэл нэвтрэх эрхгүй байна. Админаас мэдээллийг засаад хадгалбал шинэ нэвтрэх эрх үүснэ."
                : "Таны нэвтрэх эрх орон сууцтай холбогдоогүй тул төлбөр, машин, зочны мэдээлэл харагдахгүй байна."}
            </p>
          </div>

          <div className="rounded-lg border border-amber-200/80 bg-white/70 p-3 dark:border-amber-500/15 dark:bg-zinc-900/40">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300">
              <Link2 className="size-3.5" />
              Админ хийх алхмууд
            </p>
            <ol className="list-decimal space-y-1.5 pl-4 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
              <li>
                <span className="font-medium text-zinc-800 dark:text-zinc-200">Админ → Оршин суугчид</span>{" "}
                хэсэгт шинэ оршин суугч бүртгэнэ
              </li>
              <li>
                <span className="font-medium">Орон сууц</span> сонгож, и-мэйл оруулна
              </li>
              <li>Систем и-мэйлээр шинэ нэвтрэх эрх үүсгэнэ</li>
              <li>Тухайн и-мэйл, анхны нууц үгээр нэвтэрнэ</li>
            </ol>
          </div>

          <p className="text-xs text-amber-800/70 dark:text-amber-300/70">
            Админаас бүртгүүлээгүй бол энэ хуудас хоосон харагдана.
          </p>
        </div>
      </div>
    </div>
  );
}
