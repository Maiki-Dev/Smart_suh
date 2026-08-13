import { NextResponse } from 'next/server';
import { requireAdminRole } from '@/lib/permissions';
import { getScopedOrganizationId, assertOrganizationAccess } from '@/lib/admin/org-scope';
import { getBuildingTwinData } from '@/lib/queries/digital-twin';
import { getBuildingById } from '@/lib/queries/buildings';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await requireAdminRole();
    const orgScope = getScopedOrganizationId(ctx);
    const orgId = orgScope ?? ctx.user.organization_id;
    const { id: buildingId } = await params;

    const building = await getBuildingById(buildingId);
    if (!building) {
      return NextResponse.json({ error: 'Барилга олдсонгүй' }, { status: 404 });
    }
    await assertOrganizationAccess(ctx, building.organization_id);

    const url = new URL(request.url);
    const entrance = url.searchParams.get('entrance');
    const playbackAt = url.searchParams.get('playbackAt');

    const data = await getBuildingTwinData(buildingId, orgId, {
      entrance: entrance || null,
      playbackAt: playbackAt || null,
    });

    if (!data) {
      return NextResponse.json({ error: 'Мэдээлэл олдсонгүй' }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Алдаа гарлаа' },
      { status: 500 },
    );
  }
}
