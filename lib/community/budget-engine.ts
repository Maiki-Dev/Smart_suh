import 'server-only';

import { query, type DbClient } from '@/lib/db';
import { createAuditLog } from '@/lib/queries/audit_logs';
import { createNotification } from '@/lib/queries/notifications';
import {
  getProposalById,
  updateProposalStatus,
  listEligibleVoters,
  getContributionPlanByProposal,
} from '@/lib/queries/community';
import {
  getOrCreateReserveFund,
  reserveFundsForProposal,
} from '@/lib/community/reserve-fund';
import type {
  CommunityProposal,
  ContributionAllocationMethod,
  ProposalFundingSource,
} from '@/types';

interface ApplicableApartment {
  id: string;
  area_m2: number | null;
  resident_count: number;
}

async function getApplicableApartments(
  proposal: CommunityProposal,
  client: DbClient,
): Promise<ApplicableApartment[]> {
  const eligible = await listEligibleVoters(proposal.id, client);
  const apartmentIds = [...new Set(eligible.map((e) => e.apartment_id))];

  if (apartmentIds.length === 0) return [];

  const { rows } = await query<ApplicableApartment>(
    `
      SELECT a.id, a.area_m2,
             (SELECT COUNT(*)::int FROM residents r
               WHERE r.apartment_id = a.id AND r.status = 'ACTIVE') AS resident_count
        FROM apartments a
       WHERE a.id = ANY($1::uuid[])
    `,
    [apartmentIds],
    client,
  );
  return rows.map((r) => ({
    id: r.id,
    area_m2: r.area_m2 ? parseFloat(String(r.area_m2)) : null,
    resident_count: Number(r.resident_count),
  }));
}

function allocateContributionAmounts(
  totalRequired: number,
  apartments: ApplicableApartment[],
  method: ContributionAllocationMethod,
): Map<string, number> {
  const result = new Map<string, number>();
  if (apartments.length === 0 || totalRequired <= 0) return result;

  switch (method) {
    case 'EQUAL_PER_APARTMENT': {
      const perApt = Math.round((totalRequired / apartments.length) * 100) / 100;
      let allocated = 0;
      apartments.forEach((apt, i) => {
        const amt = i === apartments.length - 1 ? totalRequired - allocated : perApt;
        result.set(apt.id, amt);
        allocated += amt;
      });
      break;
    }
    case 'BY_SQUARE_METER': {
      const totalArea = apartments.reduce((s, a) => s + Math.max(a.area_m2 ?? 1, 1), 0);
      let allocated = 0;
      apartments.forEach((apt, i) => {
        const weight = Math.max(apt.area_m2 ?? 1, 1) / totalArea;
        const amt =
          i === apartments.length - 1
            ? Math.round((totalRequired - allocated) * 100) / 100
            : Math.round(totalRequired * weight * 100) / 100;
        result.set(apt.id, amt);
        allocated += amt;
      });
      break;
    }
    case 'BY_RESIDENT_COUNT': {
      const totalResidents = apartments.reduce((s, a) => s + Math.max(a.resident_count, 1), 0);
      let allocated = 0;
      apartments.forEach((apt, i) => {
        const weight = Math.max(apt.resident_count, 1) / totalResidents;
        const amt =
          i === apartments.length - 1
            ? Math.round((totalRequired - allocated) * 100) / 100
            : Math.round(totalRequired * weight * 100) / 100;
        result.set(apt.id, amt);
        allocated += amt;
      });
      break;
    }
    default: {
      const perApt = Math.round((totalRequired / apartments.length) * 100) / 100;
      apartments.forEach((apt) => result.set(apt.id, perApt));
    }
  }

  return result;
}

async function createCommunityInvoice(
  input: {
    organizationId: string;
    apartmentId: string;
    proposalId: string;
    amount: number;
    dueDate: string;
    title: string;
  },
  client: DbClient,
): Promise<string> {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const { rows: seqRows } = await query<{ count: string }>(
    `
      SELECT COUNT(*)::text AS count FROM invoices
       WHERE organization_id = $1 AND billing_year = $2 AND billing_month = $3
    `,
    [input.organizationId, year, month],
    client,
  );
  const seq = String(parseInt(seqRows[0]?.count ?? '0', 10) + 1).padStart(4, '0');
  const invoiceNumber = `INV-${year}-${String(month).padStart(2, '0')}-${seq}-COM`;

  const { rows: existing } = await query<{ id: string }>(
    `
      SELECT id FROM invoices
       WHERE community_proposal_id = $1 AND apartment_id = $2 AND status != 'CANCELLED'
       LIMIT 1
    `,
    [input.proposalId, input.apartmentId],
    client,
  );
  if (existing[0]) return existing[0].id;

  const { rows } = await query<{ id: string }>(
    `
      INSERT INTO invoices (
        organization_id, apartment_id, invoice_number,
        billing_year, billing_month, fee_type, amount,
        paid_amount, remaining_amount, due_date, status,
        community_proposal_id
      ) VALUES (
        $1, $2, $3, $4, $5, 'COMMUNITY'::invoice_fee_type, $6,
        0, $6, $7::date, 'PENDING'::inv_status, $8
      )
      RETURNING id
    `,
    [
      input.organizationId,
      input.apartmentId,
      invoiceNumber,
      year,
      month,
      input.amount,
      input.dueDate,
      input.proposalId,
    ],
    client,
  );

  const { rows: residents } = await query<{ user_id: string }>(
    `
      SELECT user_id FROM residents
       WHERE apartment_id = $1 AND status = 'ACTIVE' AND user_id IS NOT NULL
    `,
    [input.apartmentId],
    client,
  );

  for (const r of residents) {
    await createNotification({
      organization_id: input.organizationId,
      user_id: r.user_id,
      type: 'COMMUNITY',
      title: '💰 Шинэ нэмэлт төлбөр',
      message: `${input.title}: ${input.amount.toLocaleString('mn-MN')} ₮`,
      client,
    });
  }

  return rows[0].id;
}

export async function processApprovedProposal(
  proposalId: string,
  actorId?: string | null,
  client?: DbClient,
): Promise<void> {
  const run = async (db: DbClient) => {
    const proposal = await getProposalById(proposalId, db);
    if (!proposal) throw new Error('Санал олдсонгүй');

    const budget = proposal.estimated_budget;
    let reserveUsed = 0;
    let fundingGap = budget;

    const fundingSource = proposal.funding_source as ProposalFundingSource;

    if (fundingSource === 'RESERVE_FUND' || fundingSource === 'MIXED') {
      const fund = proposal.reserve_fund_id
        ? await import('@/lib/community/reserve-fund').then((m) => m.getReserveFundById(proposal.reserve_fund_id!, db))
        : await getOrCreateReserveFund(proposal.organization_id, db);

      if (fund) {
        reserveUsed = Math.min(fund.available_amount, fundingSource === 'MIXED' ? fund.available_amount : budget);
        if (reserveUsed > 0) {
          await reserveFundsForProposal(
            {
              organizationId: proposal.organization_id,
              reserveFundId: fund.id,
              proposalId: proposal.id,
              amount: reserveUsed,
              actorId,
            },
            db,
          );
          fundingGap = budget - reserveUsed;
        }
      }
    } else {
      fundingGap = budget;
    }

    await updateProposalStatus(proposalId, 'BUDGET_RESERVED', db);

    let contributionMethod: ContributionAllocationMethod = 'EQUAL_PER_APARTMENT';
    const rules = proposal.eligibility_rules;
    if (rules.contribution_method) {
      contributionMethod = rules.contribution_method;
    }

    if (
      fundingGap > 0 ||
      fundingSource === 'SPECIAL_CONTRIBUTION'
    ) {
      const gap = fundingSource === 'SPECIAL_CONTRIBUTION' ? budget : fundingGap;
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 30);

      const { rows: planRows } = await query<{ id: string }>(
        `
          INSERT INTO contribution_plans
            (proposal_id, organization_id, total_required, allocation_method, due_date, status)
          VALUES ($1, $2, $3, $4::contribution_allocation_method, $5::date, 'PENDING')
          ON CONFLICT DO NOTHING
          RETURNING id
        `,
        [proposalId, proposal.organization_id, gap, contributionMethod, dueDate.toISOString().slice(0, 10)],
        db,
      );

      let planId: string | null = planRows[0]?.id ?? null;
      if (!planId) {
        const existing = await getContributionPlanByProposal(proposalId, db);
        planId = existing?.id ?? null;
      }
      if (!planId) throw new Error('Contribution plan үүсгэж чадсангүй');

      const apartments = await getApplicableApartments(proposal, db);
      const amounts = allocateContributionAmounts(gap, apartments, contributionMethod);

      for (const apt of apartments) {
        const amount = amounts.get(apt.id) ?? 0;
        if (amount <= 0) continue;

        const { rows: residentRows } = await query<{ id: string }>(
          `SELECT id FROM residents WHERE apartment_id = $1 AND status = 'ACTIVE' LIMIT 1`,
          [apt.id],
          db,
        );

        const invoiceId = await createCommunityInvoice(
          {
            organizationId: proposal.organization_id,
            apartmentId: apt.id,
            proposalId: proposal.id,
            amount,
            dueDate: dueDate.toISOString().slice(0, 10),
            title: proposal.title,
          },
          db,
        );

        await query(
          `
            INSERT INTO contribution_allocations
              (contribution_plan_id, apartment_id, resident_id, amount, invoice_id, status)
            VALUES ($1, $2, $3, $4, $5, 'INVOICED')
            ON CONFLICT (contribution_plan_id, apartment_id) DO NOTHING
          `,
          [planId, apt.id, residentRows[0]?.id ?? null, amount, invoiceId],
          db,
        );
      }

      await updateProposalStatus(proposalId, 'FUNDING_IN_PROGRESS', db);
    } else {
      await updateProposalStatus(proposalId, 'FUNDED', db);
    }

    const { rows: projectRows } = await query<{ id: string }>(
      `
        INSERT INTO community_projects
          (proposal_id, organization_id, status, approved_budget)
        VALUES ($1, $2, 'READY_TO_START', $3)
        ON CONFLICT (proposal_id) DO UPDATE SET approved_budget = EXCLUDED.approved_budget
        RETURNING id
      `,
      [proposalId, proposal.organization_id, budget],
      db,
    );

    await createAuditLog({
      organization_id: proposal.organization_id,
      actor_id: actorId,
      action: 'PROPOSAL_APPROVED',
      entity_type: 'community_proposal',
      entity_id: proposalId,
      new_data: {
        reserve_used: reserveUsed,
        funding_gap: fundingGap,
        project_id: projectRows[0]?.id,
      },
      client: db,
    });
  };

  if (client) return run(client);
  const { withTransaction } = await import('@/lib/db');
  return withTransaction(run);
}
