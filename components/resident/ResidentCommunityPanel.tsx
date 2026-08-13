"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { CommunityProposal, ProposalVote } from "@/types";
import type { OrganizationReserveFund } from "@/types";
import {
  castVoteAction,
  addProposalCommentAction,
  type ResidentCommunityActionState,
} from "@/app/resident/community/actions";
import {
  proposalCategoryLabel,
  proposalStatusLabel,
  fundingSourceLabel,
  voteChoiceLabel,
} from "@/lib/community/labels";
import { computeFinancialInsight } from "@/lib/community/financial-insight";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { formatMNT } from "@/lib/admin/format";
import { formatDateTimeMn } from "@/lib/format/datetime";
import { useActionToast } from "@/lib/hooks/use-action-toast";
import { ArrowLeft, AlertTriangle, ThumbsUp, ThumbsDown, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

const initialState: ResidentCommunityActionState = { status: "idle" };

export function ResidentCommunityList({
  proposals,
}: {
  proposals: Array<CommunityProposal & { has_voted: boolean; is_eligible: boolean }>;
}) {
  const active = proposals.filter((p) => p.status === "VOTING_OPEN" && p.is_eligible);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>🗳 Идэвхтэй санал хураалт</CardTitle>
          <CardDescription>Оршин суугчийн санал асуулга</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {active.length === 0 ? (
            <EmptyState title="Одоогоор идэвхтэй санал байхгүй" />
          ) : (
            active.map((p) => (
              <Link
                key={p.id}
                href={`/resident/community/${p.id}`}
                className="flex items-center justify-between gap-3 rounded-lg border p-3 hover:bg-muted/50"
              >
                <div className="min-w-0">
                  <p className="font-medium truncate">{p.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatMNT(p.estimated_budget)} ·{" "}
                    {p.voting_end_at ? formatDateTimeMn(p.voting_end_at) : "—"}
                  </p>
                </div>
                <Badge variant={p.has_voted ? "secondary" : "default"}>
                  {p.has_voted ? "Санал өгсөн" : "Санал өгөх"}
                </Badge>
              </Link>
            ))
          )}
        </CardContent>
      </Card>

      {proposals.filter((p) => p.status !== "VOTING_OPEN").length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Өмнөх саналууд</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {proposals
              .filter((p) => p.status !== "VOTING_OPEN")
              .map((p) => (
                <Link
                  key={p.id}
                  href={`/resident/community/${p.id}`}
                  className="flex items-center justify-between rounded-lg border p-3 text-sm hover:bg-muted/50"
                >
                  <span className="truncate">{p.title}</span>
                  <Badge variant="outline">{proposalStatusLabel(p.status)}</Badge>
                </Link>
              ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

export function ResidentProposalDetail({
  proposal,
  reserveFund,
  myVote,
  isEligible,
  canVote,
  comments,
  voteSummary,
}: {
  proposal: CommunityProposal;
  reserveFund: OrganizationReserveFund;
  myVote: ProposalVote | null;
  isEligible: boolean;
  canVote: boolean;
  comments: Array<{ id: string; content: string; first_name?: string; last_name?: string; apartment_number?: string; is_pinned: boolean; created_at: string }>;
  voteSummary: { yes: number; no: number; abstain: number; total: number };
}) {
  const [voteState, voteAction, votePending] = useActionState(castVoteAction, initialState);
  const [commentState, commentAction, commentPending] = useActionState(addProposalCommentAction, initialState);
  useActionToast(voteState, { successMessage: "Санал бүртгэгдлээ" });
  useActionToast(commentState, { successMessage: "Сэтгэгдэл нэмэгдлээ" });

  const insight = computeFinancialInsight(reserveFund.available_amount, proposal.estimated_budget);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <Link href="/resident/community" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Буцах
      </Link>

      <div>
        <Badge variant="outline" className="mb-2">{proposalCategoryLabel(proposal.category)}</Badge>
        <h2 className="text-xl font-semibold">{proposal.title}</h2>
        <p className="text-sm text-muted-foreground mt-1">{proposalStatusLabel(proposal.status)}</p>
      </div>

      {proposal.description ? (
        <Card><CardContent className="pt-4 text-sm whitespace-pre-wrap">{proposal.description}</CardContent></Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>💡 Санхүүгийн нөлөө</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm">
          <p>Төсөв: <strong>{formatMNT(proposal.estimated_budget)}</strong></p>
          <p>Санхүүжилт: <strong>{fundingSourceLabel(proposal.funding_source)}</strong></p>
          <p>Одоогийн нөөц сан: <strong>{formatMNT(reserveFund.available_amount)}</strong></p>
          <p>Төсөл дараа үлдэх: <strong>{formatMNT(insight.remaining)}</strong></p>
          {insight.warning ? (
            <p className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="size-4" />
              Нөөц сангийн 70%-аас илүү зарцуулна
            </p>
          ) : null}
          {proposal.voting_end_at ? (
            <p className="text-muted-foreground">Санал хураалт дуусах: {formatDateTimeMn(proposal.voting_end_at)}</p>
          ) : null}
        </CardContent>
      </Card>

      {proposal.status === "VOTING_OPEN" && isEligible ? (
        <Card>
          <CardHeader>
            <CardTitle>🏢 Community Decision</CardTitle>
            <CardDescription>
              {myVote ? `Таны санал: ${voteChoiceLabel(myVote.vote)}` : "Саналаа өгнө үү"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {canVote ? (
              <form action={voteAction} className="grid gap-3 sm:grid-cols-3">
                <input type="hidden" name="proposal_id" value={proposal.id} />
                <VoteButton name="vote" value="YES" label="Зөвшөөрөх" icon={ThumbsUp} pending={votePending} />
                <VoteButton name="vote" value="NO" label="Татгалзах" icon={ThumbsDown} pending={votePending} />
                <VoteButton name="vote" value="ABSTAIN" label="Түдгэлзэх" icon={Circle} pending={votePending} />
              </form>
            ) : (
              <p className="text-sm text-muted-foreground">Санал хураалтын хугацаа дууссан эсвэл өөрчлөх боломжгүй</p>
            )}
          </CardContent>
        </Card>
      ) : null}

      {voteSummary.total > 0 && proposal.vote_visibility === "PUBLIC" ? (
        <Card>
          <CardHeader><CardTitle>Үр дүн</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-3 gap-2 text-sm">
            <p>👍 {voteSummary.yes}</p>
            <p>👎 {voteSummary.no}</p>
            <p>○ {voteSummary.abstain}</p>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader><CardTitle>Хэлэлцүүлэг</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {comments.map((c) => (
            <div key={c.id} className={cn("rounded border p-3 text-sm", c.is_pinned && "border-primary/40 bg-primary/5")}>
              <p className="font-medium">
                {c.first_name} {c.last_name}
                {c.apartment_number ? ` · ${c.apartment_number}` : ""}
              </p>
              <p className="mt-1">{c.content}</p>
            </div>
          ))}
          {isEligible ? (
            <form action={commentAction} className="border-t pt-4 space-y-3">
              <input type="hidden" name="proposal_id" value={proposal.id} />
              <textarea
                name="content"
                rows={3}
                required
                className="w-full rounded-md border px-3 py-2 text-sm"
                placeholder="Санал, сэтгэгдэл..."
              />
              <Button type="submit" disabled={commentPending}>Илгээх</Button>
            </form>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

function VoteButton({
  name,
  value,
  label,
  icon: Icon,
  pending,
}: {
  name: string;
  value: string;
  label: string;
  icon: typeof ThumbsUp;
  pending: boolean;
}) {
  return (
    <Button type="submit" name={name} value={value} variant="outline" disabled={pending} className="h-auto flex-col gap-2 py-4">
      <Icon className="size-5" />
      {label}
    </Button>
  );
}
