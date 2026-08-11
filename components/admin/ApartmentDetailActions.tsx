"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { UserPlus, Trash2 } from "lucide-react";
import { deleteApartmentAction } from "@/app/admin/apartments/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { notifyActionResult } from "@/lib/hooks/use-action-toast";

export function ApartmentDetailActions({
  apartmentId,
  hasOwner,
  canDelete,
  deleteBlockers,
}: {
  apartmentId: string;
  hasOwner: boolean;
  canDelete: boolean;
  deleteBlockers: string[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <div className="mt-6 flex flex-col gap-4">
      {!hasOwner ? (
        <Card className="border-emerald-200 bg-emerald-50/50 dark:border-emerald-900 dark:bg-emerald-950/20">
          <CardContent className="py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-emerald-900 dark:text-emerald-200">
                Эзэмшигч бүртгэгдээгүй байна
              </p>
              <p className="text-xs text-emerald-800/80 dark:text-emerald-300/80 mt-0.5">
                Орон сууц үүсгэсний дараа оршин суугч бүртгээд &quot;Эзэмшигч болгох&quot; гэж тэмдэглэнэ.
              </p>
            </div>
            <Link
              href={`/admin/residents?apartment=${apartmentId}&new=1`}
              className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-sm font-medium text-white hover:bg-emerald-700"
            >
              <UserPlus className="size-4" />
              Эзэмшигч бүртгэх
            </Link>
          </CardContent>
        </Card>
      ) : null}

      <Card className="border-rose-200/60 dark:border-rose-900/40">
        <CardHeader className="pb-2">
          <CardTitle className="text-base text-rose-700 dark:text-rose-300">Аюултай бүс</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            <strong>Идэвхгүй болгох</strong> (жагсаалтын Ban товч) нь орон сууцийг &quot;Хоосон&quot; болгоно — устгах биш.
            Сангаас устгахын тулд доорх товчийг ашиглана.
          </p>
          {!canDelete && deleteBlockers.length > 0 ? (
            <p className="text-xs text-amber-700 dark:text-amber-300">
              Устгах боломжгүй: {deleteBlockers.join(", ")}
            </p>
          ) : null}
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!canDelete || pending}
            className="w-fit border-rose-300 text-rose-700 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-300"
            onClick={() => {
              if (!confirm("Энэ орон сууцийг сангаас устгах уу? Энэ үйлдлийг буцаах боломжгүй.")) return;
              startTransition(async () => {
                const result = await deleteApartmentAction(apartmentId);
                if (notifyActionResult(result, "Орон сууц амжилттай устгагдлаа")) {
                  router.push("/admin/apartments");
                  router.refresh();
                }
              });
            }}
          >
            <Trash2 className="size-4 mr-1.5" />
            {pending ? "Устгаж байна..." : "Орон сууц устгах"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
