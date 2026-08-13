"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { ProposalAdminRow, CommunityDashboardStats } from "@/lib/community/types";
import type { OrganizationReserveFund } from "@/types";
import type { Building } from "@/types";
import {
  createProposalAction,
  depositReserveFundAction,
  type CommunityActionState,
} from "@/app/admin/community/actions";
import {
  proposalCategoryLabel,
  proposalStatusLabel,
  proposalStatusVariant,
  fundingSourceLabel,
} from "@/lib/community/labels";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { erpSelectClassName } from "@/components/ui/erp-dialog";
import { formatMNT } from "@/lib/admin/format";
import { formatDateTimeMn } from "@/lib/format/datetime";
import { useActionToast } from "@/lib/hooks/use-action-toast";
import { Vote, Plus, Landmark, ArrowRight } from "lucide-react";
import {
  proposalCategories,
  proposalFundingSources,
  proposalApprovalRules,
  proposalVotingModes,
  contributionMethods,
} from "@/lib/community/schemas";

const initialState: CommunityActionState = { status: "idle" };

export function CommunityDashboard({
  stats,
  proposals,
  reserveFund,
  buildings,
}: {
  stats: CommunityDashboardStats;
  proposals: ProposalAdminRow[];
  reserveFund: OrganizationReserveFund;
  buildings: Building[];
}) {
  const [createState, createAction, createPending] = useActionState(createProposalAction, initialState);
  const [depositState, depositAction, depositPending] = useActionState(depositReserveFundAction, initialState);
  useActionToast(createState, { successMessage: createState.message });
  useActionToast(depositState, { successMessage: "Нөөц санд орлого бүртгэгдлээ" });

  const active = proposals.filter((p) => p.status === "VOTING_OPEN");
  const approved = proposals.filter((p) =>
    ["APPROVED", "BUDGET_RESERVED", "FUNDING_IN_PROGRESS", "FUNDED", "IN_PROGRESS"].includes(p.status),
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Идэвхтэй санал" value={String(stats.active_votes)} icon={Vote} />
        <StatCard label="Оролцоо" value={`${stats.participation_pct.toFixed(0)}%`} />
        <StatCard label="Батлагдсан" value={String(stats.approved_projects)} />
        <StatCard label="Хэрэгжиж байгаа" value={String(stats.projects_in_progress)} />
        <StatCard label="Нөөц сан" value={formatMNT(stats.reserve_fund_total)} icon={Landmark} />
        <StatCard label="Төлөх үлдэгдэл" value={formatMNT(stats.pending_contributions)} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Landmark className="size-5" />
              Нөөц сан
            </CardTitle>
            <CardDescription>
              Боломжит: {formatMNT(reserveFund.available_amount)} · Нөөцлөгдсөн:{" "}
              {formatMNT(reserveFund.reserved_amount)} · Зарцуулсан: {formatMNT(reserveFund.spent_amount)}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={depositAction} className="flex flex-wrap items-end gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="deposit_amount">Орлого (₮)</Label>
                <Input id="deposit_amount" name="amount" type="number" min={1} required className="w-40" />
              </div>
              <div className="min-w-0 flex-1 flex flex-col gap-1.5">
                <Label htmlFor="deposit_desc">Тайлбар</Label>
                <Input id="deposit_desc" name="description" placeholder="Жишээ: сарын нөөц" />
              </div>
              <Button type="submit" disabled={depositPending}>
                {depositPending ? "..." : "Орлого нэмэх"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="size-5" />
              Шинэ санал
            </CardTitle>
            <CardDescription>Оршин суугчдын санал асуулга үүсгэх</CardDescription>
          </CardHeader>
          <CardContent>
            <CreateProposalForm
              action={createAction as unknown as (formData: FormData) => void}
              pending={createPending}
              buildings={buildings}
              reserveFundId={reserveFund.id}
            />
          </CardContent>
        </Card>
      </div>

      <Section title="Идэвхтэй санал хураалт" empty={active.length === 0 ? "Идэвхтэй санал байхгүй" : undefined}>
        {active.map((p) => (
          <ProposalRow key={p.id} proposal={p} />
        ))}
      </Section>

      <Section title="Батлагдсан / хэрэгжиж байгаа" empty={approved.length === 0 ? "Батлагдсан төсөл байхгүй" : undefined}>
        {approved.slice(0, 10).map((p) => (
          <ProposalRow key={p.id} proposal={p} />
        ))}
      </Section>

      <Section title="Бүх санал" empty={proposals.length === 0 ? "Санал байхгүй" : undefined}>
        {proposals.map((p) => (
          <ProposalRow key={p.id} proposal={p} />
        ))}
      </Section>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon?: typeof Vote;
}) {
  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">{label}</p>
          {Icon ? <Icon className="size-4 text-muted-foreground" /> : null}
        </div>
        <p className="mt-1 text-lg font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
}

function Section({
  title,
  children,
  empty,
}: {
  title: string;
  children: React.ReactNode;
  empty?: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {empty ? <EmptyState title={empty} /> : children}
      </CardContent>
    </Card>
  );
}

function ProposalRow({ proposal }: { proposal: ProposalAdminRow }) {
  return (
    <Link
      href={`/admin/community/${proposal.id}`}
      className="flex items-center justify-between gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50"
    >
      <div className="min-w-0">
        <p className="truncate font-medium">{proposal.title}</p>
        <p className="text-xs text-muted-foreground">
          {proposalCategoryLabel(proposal.category)} · {formatMNT(proposal.estimated_budget)} ·{" "}
          {proposal.vote_count}/{proposal.eligible_count} санал
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Badge variant={proposalStatusVariant(proposal.status)}>{proposalStatusLabel(proposal.status)}</Badge>
        <ArrowRight className="size-4 text-muted-foreground" />
      </div>
    </Link>
  );
}

function CreateProposalForm({
  action,
  pending,
  buildings,
  reserveFundId,
}: {
  action: (formData: FormData) => void;
  pending: boolean;
  buildings: Building[];
  reserveFundId: string;
}) {
  const now = new Date();
  const start = now.toISOString().slice(0, 16);
  const end = new Date(now.getTime() + 7 * 86400000).toISOString().slice(0, 16);

  return (
    <form action={action} className="grid gap-3 sm:grid-cols-2">
      <input type="hidden" name="reserve_fund_id" value={reserveFundId} />
      <div className="sm:col-span-2 flex flex-col gap-1.5">
        <Label htmlFor="title">Гарчиг</Label>
        <Input id="title" name="title" required placeholder="Жишээ: Тоглоомын талбай засвар" />
      </div>
      <div className="sm:col-span-2 flex flex-col gap-1.5">
        <Label htmlFor="description">Тайлбар</Label>
        <textarea
          id="description"
          name="description"
          rows={3}
          className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="category">Ангилал</Label>
        <select id="category" name="category" className={erpSelectClassName} defaultValue="IMPROVEMENT">
          {proposalCategories.map((c) => (
            <option key={c} value={c}>{proposalCategoryLabel(c)}</option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="building_id">Барилга</Label>
        <select id="building_id" name="building_id" className={erpSelectClassName}>
          <option value="">— Бүгд —</option>
          {buildings.map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="estimated_budget">Төсөв (₮)</Label>
        <Input id="estimated_budget" name="estimated_budget" type="number" min={0} required />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="funding_source">Санхүүжилт</Label>
        <select id="funding_source" name="funding_source" className={erpSelectClassName} defaultValue="RESERVE_FUND">
          {proposalFundingSources.map((f) => (
            <option key={f} value={f}>{fundingSourceLabel(f)}</option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="voting_start_at">Эхлэх</Label>
        <Input id="voting_start_at" name="voting_start_at" type="datetime-local" defaultValue={start} required />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="voting_end_at">Дуусах</Label>
        <Input id="voting_end_at" name="voting_end_at" type="datetime-local" defaultValue={end} required />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="approval_rule">Батлах дүрэм</Label>
        <select id="approval_rule" name="approval_rule" className={erpSelectClassName} defaultValue="SIMPLE_MAJORITY">
          {proposalApprovalRules.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="voting_mode">Санал өгөх горим</Label>
        <select id="voting_mode" name="voting_mode" className={erpSelectClassName} defaultValue="ONE_APARTMENT_ONE_VOTE">
          {proposalVotingModes.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="quorum_percentage">Quorum (%)</Label>
        <Input id="quorum_percentage" name="quorum_percentage" type="number" min={0} max={100} defaultValue={50} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="approval_percentage">Батлах (%)</Label>
        <Input id="approval_percentage" name="approval_percentage" type="number" min={0} max={100} defaultValue={50} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="eligibility_scope">Оролцогчид</Label>
        <select id="eligibility_scope" name="eligibility_scope" className={erpSelectClassName} defaultValue="ENTIRE_BUILDING">
          <option value="ENTIRE_BUILDING">Бүх барилга</option>
          <option value="ENTRANCE">Тодорхой орц</option>
          <option value="FLOOR">Давхар</option>
          <option value="APARTMENTS">Орон сууц</option>
          <option value="PARKING_OWNERS">Зогсоолын эзэд</option>
        </select>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="contribution_method">Хувь нэмэр хуваарилах</Label>
        <select id="contribution_method" name="contribution_method" className={erpSelectClassName} defaultValue="EQUAL_PER_APARTMENT">
          {contributionMethods.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
      </div>
      <div className="sm:col-span-2 flex flex-wrap gap-2 pt-2">
        <Button type="submit" name="publish" value="false" variant="outline" disabled={pending}>
          Ноорог хадгалах
        </Button>
        <Button type="submit" name="publish" value="true" disabled={pending}>
          {pending ? "Үүсгэж байна..." : "Нийтэлж санал эхлүүлэх"}
        </Button>
      </div>
    </form>
  );
}
