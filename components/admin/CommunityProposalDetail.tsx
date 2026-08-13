"use client";

import Link from "next/link";
import { useTransition } from "react";
import type { CommunityProposal, CommunityProject, ContributionPlan } from "@/types";
import type { OrganizationReserveFund } from "@/types";
import {
  closeVotingAction,
  cancelProposalAction,
  emergencyApproveAction,
  publishProposalAction,
  startProjectAction,
  completeProjectAction,
  addProjectExpenseAction,
  addProjectUpdateAction,
  type CommunityActionState,
} from "@/app/admin/community/actions";
import {
  proposalCategoryLabel,
  proposalStatusLabel,
  proposalStatusVariant,
  fundingSourceLabel,
  approvalRuleLabel,
  projectStatusLabel,
} from "@/lib/community/labels";
import { computeFinancialInsight } from "@/lib/community/financial-insight";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatMNT } from "@/lib/admin/format";
import { formatDateTimeMn } from "@/lib/format/datetime";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import { useActionState } from "react";
import { useActionToast } from "@/lib/hooks/use-action-toast";

const initialState: CommunityActionState = { status: "idle" };

export function CommunityProposalDetail({
  proposal,
  reserveFund,
  votes,
  eligibleCount,
  project,
  contributionPlan,
  expenses,
  updates,
}: {
  proposal: CommunityProposal;
  reserveFund: OrganizationReserveFund;
  votes: Array<{ vote: string; weight: number; first_name?: string; last_name?: string; apartment_number?: string }>;
  eligibleCount: number;
  project: CommunityProject | null;
  contributionPlan: ContributionPlan | null;
  expenses: Array<{ id: string; amount: number; description: string; supplier: string | null; expense_date: string }>;
  updates: Array<{ id: string; title: string; content: string | null; created_at: string }>;
}) {
  const [expenseState, expenseAction, expensePending] = useActionState(addProjectExpenseAction, initialState);
  const [updateState, updateAction, updatePending] = useActionState(addProjectUpdateAction, initialState);
  useActionToast(expenseState, { successMessage: "Зардал бүртгэгдлээ" });
  useActionToast(updateState, { successMessage: "Шинэчлэл нэмэгдлээ" });

  const insight = computeFinancialInsight(reserveFund.available_amount, proposal.estimated_budget);
  const yesTotal = proposal.result_yes_weight;
  const noTotal = proposal.result_no_weight;
  const totalVotes = yesTotal + noTotal + proposal.result_abstain_weight;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <Link href="/admin/community" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Буцах
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">{proposal.title}</h2>
          <p className="text-sm text-muted-foreground">
            {proposalCategoryLabel(proposal.category)} · {fundingSourceLabel(proposal.funding_source)}
          </p>
        </div>
        <Badge variant={proposalStatusVariant(proposal.status)}>{proposalStatusLabel(proposal.status)}</Badge>
      </div>

      {proposal.description ? (
        <Card>
          <CardContent className="pt-4 text-sm whitespace-pre-wrap">{proposal.description}</CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>💡 Санхүүгийн нөлөө</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
          <p>Төсөв: <strong>{formatMNT(proposal.estimated_budget)}</strong></p>
          <p>Нөөц сан (боломжит): <strong>{formatMNT(reserveFund.available_amount)}</strong></p>
          <p>Төсөл дараа үлдэх: <strong>{formatMNT(insight.remaining)}</strong></p>
          <p>Нөөц бууралт: <strong>{insight.reductionPct.toFixed(0)}%</strong></p>
          {insight.warning ? (
            <p className="sm:col-span-2 flex items-center gap-2 text-amber-600">
              <AlertTriangle className="size-4" />
              Энэ төсөл нөөц сангийн 70%-аас илүү зарцуулна
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Санал хураалт</CardTitle>
          <CardDescription>
            {approvalRuleLabel(proposal.approval_rule)} · {votes.length}/{eligibleCount} оролцсон
            {proposal.voting_end_at ? ` · Дуусах: ${formatDateTimeMn(proposal.voting_end_at)}` : null}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {totalVotes > 0 ? (
            <div className="grid gap-2 sm:grid-cols-3 text-sm">
              <p>👍 YES: <strong>{yesTotal}</strong></p>
              <p>👎 NO: <strong>{noTotal}</strong></p>
              <p>○ ABSTAIN: <strong>{proposal.result_abstain_weight}</strong></p>
            </div>
          ) : null}

          {proposal.vote_visibility === "PUBLIC" && votes.length > 0 ? (
            <ul className="max-h-48 space-y-1 overflow-y-auto text-sm">
              {votes.map((v, i) => (
                <li key={i} className="text-muted-foreground">
                  {v.apartment_number} — {v.first_name} {v.last_name}: {v.vote} ({v.weight})
                </li>
              ))}
            </ul>
          ) : null}

          <AdminActions proposal={proposal} />
        </CardContent>
      </Card>

      {contributionPlan ? (
        <Card>
          <CardHeader>
            <CardTitle>Санхүүжилт</CardTitle>
            <CardDescription>
              Шаардлагатай: {formatMNT(contributionPlan.total_required)} · Цугласан:{" "}
              {formatMNT(contributionPlan.total_collected)}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-primary transition-all"
                style={{
                  width: `${contributionPlan.total_required > 0 ? Math.min(100, (contributionPlan.total_collected / contributionPlan.total_required) * 100) : 0}%`,
                }}
              />
            </div>
          </CardContent>
        </Card>
      ) : null}

      {project ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle>🏗 Төсөл</CardTitle>
              <CardDescription>
                {projectStatusLabel(project.status)} · Зарцуулсан: {formatMNT(project.actual_spent)} /{" "}
                {formatMNT(project.approved_budget)}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full bg-emerald-600" style={{ width: `${project.progress_percentage}%` }} />
              </div>
              <ProjectActions proposalId={proposal.id} project={project} />

              {expenses.length > 0 ? (
                <ul className="space-y-2 text-sm">
                  {expenses.map((e) => (
                    <li key={e.id} className="rounded border p-2">
                      <p className="font-medium">{e.description}</p>
                      <p className="text-muted-foreground">
                        {formatMNT(e.amount)} · {e.supplier ?? "—"} · {e.expense_date}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : null}

              <form action={expenseAction} className="grid gap-3 sm:grid-cols-2 border-t pt-4">
                <input type="hidden" name="project_id" value={project.id} />
                <div className="flex flex-col gap-1.5">
                  <Label>Дүн</Label>
                  <Input name="amount" type="number" min={1} required />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Нийлүүлэгч</Label>
                  <Input name="supplier" />
                </div>
                <div className="sm:col-span-2 flex flex-col gap-1.5">
                  <Label>Тайлбар</Label>
                  <Input name="description" required />
                </div>
                <Button type="submit" disabled={expensePending} className="sm:col-span-2 w-fit">
                  Зардал нэмэх
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Шинэчлэл</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {updates.map((u) => (
                <div key={u.id} className="rounded border p-3 text-sm">
                  <p className="font-medium">{u.title}</p>
                  {u.content ? <p className="text-muted-foreground">{u.content}</p> : null}
                  <p className="text-xs text-muted-foreground mt-1">{formatDateTimeMn(u.created_at)}</p>
                </div>
              ))}
              <form action={updateAction} className="grid gap-3 border-t pt-4">
                <input type="hidden" name="project_id" value={project.id} />
                <Input name="title" placeholder="Гарчиг" required />
                <textarea name="content" rows={2} className="rounded-md border px-3 py-2 text-sm" placeholder="Тайлбар" />
                <Button type="submit" disabled={updatePending} className="w-fit">Шинэчлэл нэмэх</Button>
              </form>
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}

function AdminActions({ proposal }: { proposal: CommunityProposal }) {
  const [pending, startTransition] = useTransition();

  const run = (fn: () => Promise<CommunityActionState>) => {
    startTransition(async () => {
      await fn();
      window.location.reload();
    });
  };

  return (
    <div className="flex flex-wrap gap-2">
      {proposal.status === "DRAFT" ? (
        <Button size="sm" disabled={pending} onClick={() => run(() => publishProposalAction(proposal.id))}>
          Нийтлэх
        </Button>
      ) : null}
      {proposal.status === "VOTING_OPEN" ? (
        <Button size="sm" disabled={pending} onClick={() => run(() => closeVotingAction(proposal.id))}>
          Санал хаах
        </Button>
      ) : null}
      {!["CANCELLED", "COMPLETED"].includes(proposal.status) ? (
        <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => cancelProposalAction(proposal.id))}>
          Цуцлах
        </Button>
      ) : null}
      {proposal.category === "EMERGENCY" && !["APPROVED", "COMPLETED", "CANCELLED"].includes(proposal.status) ? (
        <Button size="sm" variant="destructive" disabled={pending} onClick={() => run(() => emergencyApproveAction(proposal.id))}>
          Яаралтай батлах
        </Button>
      ) : null}
    </div>
  );
}

function ProjectActions({ proposalId, project }: { proposalId: string; project: CommunityProject }) {
  const [pending, startTransition] = useTransition();
  const run = (fn: () => Promise<CommunityActionState>) => {
    startTransition(async () => {
      await fn();
      window.location.reload();
    });
  };

  return (
    <div className="flex flex-wrap gap-2">
      {project.status === "READY_TO_START" ? (
        <Button size="sm" disabled={pending} onClick={() => run(() => startProjectAction(proposalId))}>
          Төсөл эхлүүлэх
        </Button>
      ) : null}
      {project.status === "IN_PROGRESS" ? (
        <Button size="sm" disabled={pending} onClick={() => run(() => completeProjectAction(proposalId))}>
          Дуусгах
        </Button>
      ) : null}
    </div>
  );
}
