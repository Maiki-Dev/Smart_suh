import { verifyCronRequest } from '@/lib/cron/verify-cron';
import { query } from '@/lib/db';
import { recordBuildingHealthSnapshots } from '@/lib/queries/digital-twin';

export async function GET(request: Request) {
  const denied = verifyCronRequest(request);
  if (denied) return denied;

  const { rows: orgs } = await query<{ id: string }>(
    `SELECT id FROM organizations ORDER BY name`,
  );

  let totalBuildings = 0;
  let totalApartments = 0;

  for (const org of orgs) {
    const result = await recordBuildingHealthSnapshots(org.id);
    totalBuildings += result.buildings;
    totalApartments += result.apartments;
  }

  return Response.json({
    ok: true,
    organizations: orgs.length,
    buildings: totalBuildings,
    apartments: totalApartments,
  });
}
