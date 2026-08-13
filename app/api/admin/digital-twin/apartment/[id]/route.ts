import { NextResponse } from 'next/server';
import { requireAdminRole } from '@/lib/permissions';
import { getScopedOrganizationId, assertOrganizationAccess } from '@/lib/admin/org-scope';
import { getApartmentTwinDetail } from '@/lib/queries/digital-twin';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await requireAdminRole();
    const orgScope = getScopedOrganizationId(ctx);
    const orgId = orgScope ?? ctx.user.organization_id;
    const { id: apartmentId } = await params;

    await assertOrganizationAccess(ctx, orgId);

    const detail = await getApartmentTwinDetail(apartmentId, orgId);
    if (!detail) {
      return NextResponse.json({ error: 'Орон сууц олдсонгүй' }, { status: 404 });
    }

    return NextResponse.json(detail);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Алдаа гарлаа' },
      { status: 500 },
    );
  }
}
