import 'server-only';

import { query, withTransaction, type DbClient } from '@/lib/db';
import { createAuditLog } from '@/lib/queries/audit_logs';
import type { OrganizationReserveFund, ReserveFundTxType } from '@/types';

const SELECT = `
  SELECT id, organization_id, name, available_amount, reserved_amount, spent_amount,
         created_at, updated_at
    FROM organization_reserve_funds
`;

export async function getOrCreateReserveFund(
  organizationId: string,
  client?: DbClient,
): Promise<OrganizationReserveFund> {
  const { rows } = await query<OrganizationReserveFund>(
    `${SELECT} WHERE organization_id = $1 LIMIT 1`,
    [organizationId],
    client,
  );
  if (rows[0]) return rows[0];

  const created = await query<OrganizationReserveFund>(
    `
      INSERT INTO organization_reserve_funds (organization_id, name)
      VALUES ($1, 'Нөөц сан')
      RETURNING id, organization_id, name, available_amount, reserved_amount, spent_amount,
                created_at, updated_at
    `,
    [organizationId],
    client,
  );
  return created.rows[0];
}

export async function getReserveFundById(
  id: string,
  client?: DbClient,
): Promise<OrganizationReserveFund | null> {
  const { rows } = await query<OrganizationReserveFund>(
    `${SELECT} WHERE id = $1`,
    [id],
    client,
  );
  return rows[0] ?? null;
}

async function recordTx(
  input: {
    organizationId: string;
    reserveFundId: string;
    txType: ReserveFundTxType;
    amount: number;
    proposalId?: string | null;
    projectId?: string | null;
    description?: string | null;
    actorId?: string | null;
    fund: OrganizationReserveFund;
  },
  client: DbClient,
): Promise<OrganizationReserveFund> {
  await query(
    `
      INSERT INTO reserve_fund_transactions
        (organization_id, reserve_fund_id, proposal_id, project_id, tx_type, amount,
         balance_after_available, balance_after_reserved, balance_after_spent,
         description, created_by)
      VALUES ($1, $2, $3, $4, $5::reserve_fund_tx_type, $6, $7, $8, $9, $10, $11)
    `,
    [
      input.organizationId,
      input.reserveFundId,
      input.proposalId ?? null,
      input.projectId ?? null,
      input.txType,
      input.amount,
      input.fund.available_amount,
      input.fund.reserved_amount,
      input.fund.spent_amount,
      input.description ?? null,
      input.actorId ?? null,
    ],
    client,
  );
  return input.fund;
}

export async function depositReserveFund(input: {
  organizationId: string;
  amount: number;
  description?: string | null;
  actorId?: string | null;
}): Promise<OrganizationReserveFund> {
  return withTransaction(async (client) => {
    const fund = await getOrCreateReserveFund(input.organizationId, client);
    const { rows } = await query<OrganizationReserveFund>(
      `
        UPDATE organization_reserve_funds
           SET available_amount = available_amount + $1
         WHERE id = $2
         RETURNING id, organization_id, name, available_amount, reserved_amount, spent_amount,
                   created_at, updated_at
      `,
      [input.amount, fund.id],
      client,
    );
    const updated = rows[0];
    await recordTx({
      organizationId: input.organizationId,
      reserveFundId: fund.id,
      txType: 'DEPOSIT',
      amount: input.amount,
      description: input.description,
      actorId: input.actorId,
      fund: updated,
    }, client);

    await createAuditLog({
      organization_id: input.organizationId,
      actor_id: input.actorId,
      action: 'RESERVE_FUND_DEPOSIT',
      entity_type: 'organization_reserve_fund',
      entity_id: fund.id,
      new_data: { amount: input.amount, available: updated.available_amount },
      client,
    });

    return updated;
  });
}

export async function reserveFundsForProposal(input: {
  organizationId: string;
  reserveFundId: string;
  proposalId: string;
  amount: number;
  actorId?: string | null;
}, client: DbClient): Promise<number> {
  const fund = await getReserveFundById(input.reserveFundId, client);
  if (!fund) throw new Error('Нөөц сан олдсонгүй');
  if (fund.organization_id !== input.organizationId) {
    throw new Error('Байгууллагын эрх хүрэлцэхгүй');
  }
  if (fund.available_amount < input.amount) {
    throw new Error(`Нөөц сан хүрэлцэхгүй. Боломжит: ${fund.available_amount} ₮`);
  }

  const { rows } = await query<OrganizationReserveFund>(
    `
      UPDATE organization_reserve_funds
         SET available_amount = available_amount - $1,
             reserved_amount = reserved_amount + $1
       WHERE id = $2 AND available_amount >= $1
       RETURNING id, organization_id, name, available_amount, reserved_amount, spent_amount,
                 created_at, updated_at
    `,
    [input.amount, input.reserveFundId],
    client,
  );
  if (!rows[0]) throw new Error('Нөөц сан хүрэлцэхгүй');

  await query(
    `
      INSERT INTO proposal_budget_allocations
        (proposal_id, reserve_fund_id, allocated_amount, reserved_amount, status)
      VALUES ($1, $2, $3, $3, 'RESERVED')
    `,
    [input.proposalId, input.reserveFundId, input.amount],
    client,
  );

  await recordTx({
    organizationId: input.organizationId,
    reserveFundId: input.reserveFundId,
    txType: 'RESERVE',
    amount: input.amount,
    proposalId: input.proposalId,
    description: 'Proposal батлагдсаны дараа нөөцлөгдсөн',
    actorId: input.actorId,
    fund: rows[0],
  }, client);

  return input.amount;
}

export async function releaseReservedFunds(input: {
  organizationId: string;
  proposalId: string;
  actorId?: string | null;
}, client: DbClient): Promise<void> {
  const { rows: allocations } = await query<{
    id: string;
    reserve_fund_id: string;
    reserved_amount: string;
  }>(
    `
      SELECT id, reserve_fund_id, reserved_amount
        FROM proposal_budget_allocations
       WHERE proposal_id = $1 AND status = 'RESERVED'
    `,
    [input.proposalId],
    client,
  );

  for (const alloc of allocations) {
    const amount = parseFloat(alloc.reserved_amount);
    const { rows } = await query<OrganizationReserveFund>(
      `
        UPDATE organization_reserve_funds
           SET available_amount = available_amount + $1,
               reserved_amount = reserved_amount - $1
         WHERE id = $2 AND reserved_amount >= $1
         RETURNING id, organization_id, name, available_amount, reserved_amount, spent_amount,
                   created_at, updated_at
      `,
      [amount, alloc.reserve_fund_id],
      client,
    );
    if (!rows[0]) continue;

    await query(
      `UPDATE proposal_budget_allocations SET status = 'RELEASED', reserved_amount = 0 WHERE id = $1`,
      [alloc.id],
      client,
    );

    await recordTx({
      organizationId: input.organizationId,
      reserveFundId: alloc.reserve_fund_id,
      txType: 'RELEASE',
      amount,
      proposalId: input.proposalId,
      description: 'Proposal цуцлагдсан — нөөц суллагдсан',
      actorId: input.actorId,
      fund: rows[0],
    }, client);
  }
}

export async function spendReservedFunds(input: {
  organizationId: string;
  proposalId: string;
  projectId: string;
  amount: number;
  actorId?: string | null;
}, client: DbClient): Promise<void> {
  const { rows: allocations } = await query<{
    id: string;
    reserve_fund_id: string;
    reserved_amount: string;
    spent_amount: string;
  }>(
    `
      SELECT id, reserve_fund_id, reserved_amount, spent_amount
        FROM proposal_budget_allocations
       WHERE proposal_id = $1 AND status IN ('RESERVED', 'SPENT')
       ORDER BY created_at
    `,
    [input.proposalId],
    client,
  );

  let remaining = input.amount;
  for (const alloc of allocations) {
    if (remaining <= 0) break;
    const reserved = parseFloat(alloc.reserved_amount);
    const spend = Math.min(remaining, reserved);
    if (spend <= 0) continue;

    const { rows } = await query<OrganizationReserveFund>(
      `
        UPDATE organization_reserve_funds
           SET reserved_amount = reserved_amount - $1,
               spent_amount = spent_amount + $1
         WHERE id = $2 AND reserved_amount >= $1
         RETURNING id, organization_id, name, available_amount, reserved_amount, spent_amount,
                   created_at, updated_at
      `,
      [spend, alloc.reserve_fund_id],
      client,
    );
    if (!rows[0]) throw new Error('Нөөц зарлага гаргах боломжгүй');

    await query(
      `
        UPDATE proposal_budget_allocations
           SET reserved_amount = reserved_amount - $1,
               spent_amount = spent_amount + $1,
               status = CASE WHEN reserved_amount - $1 <= 0 THEN 'SPENT'::budget_allocation_status ELSE status END
         WHERE id = $2
      `,
      [spend, alloc.id],
      client,
    );

    await recordTx({
      organizationId: input.organizationId,
      reserveFundId: alloc.reserve_fund_id,
      txType: 'SPEND',
      amount: spend,
      proposalId: input.proposalId,
      projectId: input.projectId,
      description: 'Төслийн зарлага',
      actorId: input.actorId,
      fund: rows[0],
    }, client);

    remaining -= spend;
  }

  if (remaining > 0) {
    throw new Error('Нөөцлөгдсөн төсөв хүрэлцэхгүй');
  }
}
