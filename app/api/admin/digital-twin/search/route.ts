import { NextResponse } from 'next/server';
import { requireAdminRole } from '@/lib/permissions';
import { getScopedOrganizationId } from '@/lib/admin/org-scope';
import { searchDigitalTwin } from '@/lib/queries/digital-twin';

export async function GET(request: Request) {
  try {
    const ctx = await requireAdminRole();
    const orgScope = getScopedOrganizationId(ctx);
    const orgId = orgScope ?? ctx.user.organization_id;

    const url = new URL(request.url);
    const q = url.searchParams.get('q') ?? '';
    const buildingId = url.searchParams.get('buildingId');

    const results = await searchDigitalTwin(orgId, q, buildingId);

    return NextResponse.json({ results });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Алдаа гарлаа' },
      { status: 500 },
    );
  }
}
