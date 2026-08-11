import 'server-only';
import { query, type DbClient } from '@/lib/db';
import { getOrganizationById } from '@/lib/queries/organizations';

const RFID_PREFIX = 'RFID';
const MIN_SEQUENCE = 1001;

function deriveOrgCode(name: string, registrationNumber?: string | null): string {
  const firstWord = name.replace(/[^\w\s]/g, '').trim().split(/\s+/)[0] ?? '';
  const fromName = firstWord.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  if (fromName.length >= 2) return fromName.slice(0, 3);

  const fromReg = (registrationNumber ?? '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  if (fromReg.length >= 2) return fromReg.slice(-3);

  return 'ORG';
}

function parseRfidSequence(rfidNumber: string): number | null {
  const match = rfidNumber.match(/^RFID-[A-Z0-9]+-(\d+)$/i);
  if (!match) return null;
  const seq = parseInt(match[1], 10);
  return Number.isFinite(seq) ? seq : null;
}

async function isRfidTaken(
  organizationId: string,
  rfidNumber: string,
  client?: DbClient,
): Promise<boolean> {
  const { rows } = await query<{ id: string }>(
    `
      SELECT id
        FROM vehicles
       WHERE organization_id = $1
         AND UPPER(rfid_number) = UPPER($2)
       LIMIT 1
    `,
    [organizationId, rfidNumber],
    client,
  );
  return rows.length > 0;
}

export async function generateUniqueRfidNumber(
  organizationId: string,
  client?: DbClient,
): Promise<string> {
  const org = await getOrganizationById(organizationId, client);
  const code = deriveOrgCode(org?.name ?? 'Organization', org?.registration_number);

  const { rows } = await query<{ rfid_number: string | null }>(
    `
      SELECT rfid_number
        FROM vehicles
       WHERE organization_id = $1
         AND rfid_number IS NOT NULL
    `,
    [organizationId],
    client,
  );

  let maxSeq = MIN_SEQUENCE - 1;
  for (const row of rows) {
    if (!row.rfid_number) continue;
    const seq = parseRfidSequence(row.rfid_number);
    if (seq !== null) maxSeq = Math.max(maxSeq, seq);
  }

  for (let attempt = 0; attempt < 50; attempt++) {
    const candidate = `${RFID_PREFIX}-${code}-${maxSeq + 1 + attempt}`;
    if (!(await isRfidTaken(organizationId, candidate, client))) {
      return candidate;
    }
  }

  throw new Error('RFID дугаар үүсгэж чадсангүй');
}
