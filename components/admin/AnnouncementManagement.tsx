"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Pin, PinOff, Megaphone, EyeOff } from "lucide-react";
import type { Announcement } from "@/types";
import {
  createAnnouncementAction,
  updateAnnouncementAction,
  publishAnnouncementAction,
  unpublishAnnouncementAction,
  deleteAnnouncementAction,
  pinAnnouncementAction,
  type AnnouncementActionState,
} from "@/app/admin/announcements/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  erpDialogClassName,
  erpDialogFooterClassName,
  erpDialogHeaderClassName,
} from "@/components/ui/erp-dialog";
import { notifyActionResult, useActionToast } from "@/lib/hooks/use-action-toast";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { formatDateMn, isPastInTimeZone } from "@/lib/format/datetime";

const initialState: AnnouncementActionState = { status: "idle" };

function AnnouncementFormDialog({
  onClose,
  announcement,
}: {
  onClose: () => void;
  announcement?: Announcement | null;
}) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const action = announcement ? updateAnnouncementAction : createAnnouncementAction;
  const [state, formAction, pending] = useActionState(action, initialState);
  const formKey = announcement?.id ?? "create";

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  useActionToast(state, {
    onSuccess: () => {
      router.refresh();
      onClose();
    },
  });

  const expiresValue = announcement?.expires_at
    ? new Date(announcement.expires_at).toISOString().slice(0, 16)
    : "";

  return (
    <dialog
      ref={dialogRef}
      className={`${erpDialogClassName} w-[min(100%,640px)]`}
      onClose={onClose}
    >
      <form key={formKey} action={formAction} className="flex flex-col">
        {announcement ? <input type="hidden" name="id" value={announcement.id} /> : null}
        <div className={erpDialogHeaderClassName}>
          <h3 className="text-lg font-semibold">
            {announcement ? "Зарлал засах" : "Шинэ зарлал"}
          </h3>
        </div>
        <div className="grid gap-4 px-5 py-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="title">Гарчиг</Label>
            <Input id="title" name="title" defaultValue={announcement?.title ?? ""} required />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="content">Агуулга</Label>
            <textarea
              id="content"
              name="content"
              defaultValue={announcement?.content ?? ""}
              required
              rows={6}
              className="min-h-[120px] rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="image_url">Зураг URL</Label>
              <Input id="image_url" name="image_url" defaultValue={announcement?.image_url ?? ""} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="attachment_url">Хавсралт URL</Label>
              <Input
                id="attachment_url"
                name="attachment_url"
                defaultValue={announcement?.attachment_url ?? ""}
              />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="expires_at">Дуусах огноо</Label>
            <Input
              id="expires_at"
              name="expires_at"
              type="datetime-local"
              defaultValue={expiresValue}
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="is_pinned"
              defaultChecked={announcement?.is_pinned ?? false}
              className="size-4 rounded border-zinc-300"
            />
            Дээд талд бэхлэх
          </label>
        </div>
        <div className={erpDialogFooterClassName}>
          <Button type="button" variant="outline" onClick={onClose}>
            Болих
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? "Хадгалж байна..." : "Хадгалах"}
          </Button>
        </div>
      </form>
    </dialog>
  );
}

export function AnnouncementManagement({
  announcements,
  total,
}: {
  announcements: Announcement[];
  total: number;
}) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<Announcement | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  async function runAction(id: string, fn: (id: string) => Promise<AnnouncementActionState>) {
    setPendingId(id);
    const result = await fn(id);
    notifyActionResult(result);
    router.refresh();
    setPendingId(null);
  }

  async function runPinAction(id: string, pinned: boolean) {
    setPendingId(id);
    const result = await pinAnnouncementAction(id, pinned);
    notifyActionResult(result);
    router.refresh();
    setPendingId(null);
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader className="gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <CardTitle>Зарлал</CardTitle>
            <p className="text-sm text-zinc-500 mt-1">Нийт {total} зарлал</p>
          </div>
          <Button
            onClick={() => {
              setEditItem(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="size-4" />
            Шинэ зарлал
          </Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-xl ring-1 ring-zinc-200 dark:ring-zinc-800">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="bg-zinc-50 text-left text-[11px] uppercase tracking-wider text-zinc-500 dark:bg-zinc-900/60">
                <tr>
                  <th className="px-3 py-3">Гарчиг</th>
                  <th className="px-3 py-3">Төлөв</th>
                  <th className="px-3 py-3">Нийтлэгдсэн</th>
                  <th className="px-3 py-3">Дуусах</th>
                  <th className="px-3 py-3 text-right">Үйлдэл</th>
                </tr>
              </thead>
              <tbody>
                {announcements.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-10 text-center text-zinc-500">
                      Зарлал олдсонгүй
                    </td>
                  </tr>
                ) : (
                  announcements.map((item) => {
                    const isPublished = !!item.published_at;
                    const isExpired = item.expires_at ? isPastInTimeZone(item.expires_at) : false;

                    return (
                      <tr key={item.id} className="border-t border-zinc-100 dark:border-zinc-800">
                        <td className="px-3 py-3">
                          <div className="font-medium flex items-center gap-2">
                            {item.is_pinned ? (
                              <Pin className="size-3.5 text-amber-500 shrink-0" />
                            ) : null}
                            {item.title}
                          </div>
                          <div className="text-xs text-zinc-500 mt-0.5 line-clamp-1 max-w-md">
                            {item.content}
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          {!isPublished ? (
                            <StatusBadge label="Ноорог" tone="zinc" />
                          ) : isExpired ? (
                            <StatusBadge label="Дууссан" tone="amber" />
                          ) : (
                            <StatusBadge label="Нийтлэгдсэн" tone="emerald" />
                          )}
                        </td>
                        <td className="px-3 py-3 text-zinc-500">
                          {item.published_at
                            ? formatDateMn(item.published_at)
                            : "—"}
                        </td>
                        <td className="px-3 py-3 text-zinc-500">
                          {item.expires_at
                            ? formatDateMn(item.expires_at)
                            : "—"}
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex justify-end gap-1">
                            <Button
                              size="icon-sm"
                              variant="ghost"
                              title={item.is_pinned ? "Бэхлэлт арилгах" : "Бэхлэх"}
                              disabled={pendingId === item.id}
                              onClick={() =>
                                startTransition(() => runPinAction(item.id, !item.is_pinned))
                              }
                            >
                              {item.is_pinned ? (
                                <PinOff className="size-4" />
                              ) : (
                                <Pin className="size-4" />
                              )}
                            </Button>
                            {!isPublished ? (
                              <Button
                                size="icon-sm"
                                variant="ghost"
                                title="Нийтлэх"
                                disabled={pendingId === item.id}
                                onClick={() =>
                                  startTransition(() => runAction(item.id, publishAnnouncementAction))
                                }
                              >
                                <Megaphone className="size-4" />
                              </Button>
                            ) : (
                              <Button
                                size="icon-sm"
                                variant="ghost"
                                title="Нийтлэлээс хасах"
                                disabled={pendingId === item.id}
                                onClick={() =>
                                  startTransition(() => runAction(item.id, unpublishAnnouncementAction))
                                }
                              >
                                <EyeOff className="size-4" />
                              </Button>
                            )}
                            <Button
                              size="icon-sm"
                              variant="ghost"
                              onClick={() => {
                                setEditItem(item);
                                setDialogOpen(true);
                              }}
                            >
                              <Pencil className="size-4" />
                            </Button>
                            <Button
                              size="icon-sm"
                              variant="ghost"
                              disabled={pendingId === item.id}
                              onClick={() =>
                                startTransition(() => runAction(item.id, deleteAnnouncementAction))
                              }
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {dialogOpen ? (
        <AnnouncementFormDialog
          announcement={editItem}
          onClose={() => setDialogOpen(false)}
        />
      ) : null}
    </div>
  );
}
