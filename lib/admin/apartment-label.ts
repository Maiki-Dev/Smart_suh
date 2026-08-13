export type ApartmentLabelInput = {
  building_name: string;
  tower?: string | null;
  entrance?: string | null;
  floor?: number | null;
  apartment_number: string;
};

/** Орон сууцын сонголтын label — building/tower давхардахгүй */
export function formatApartmentOptionLabel(
  apt: ApartmentLabelInput,
  options?: { includeBuilding?: boolean },
): string {
  const parts: string[] = [];

  if (options?.includeBuilding) {
    parts.push(apt.building_name);
  }

  const tower = apt.tower?.trim();
  if (tower && tower !== apt.building_name.trim()) {
    parts.push(`${tower} блок`);
  }

  const entrance = apt.entrance?.trim();
  if (entrance) {
    parts.push(`${entrance} орц`);
  }

  if (apt.floor != null) {
    parts.push(`${apt.floor} давхар`);
  }

  parts.push(`№ ${apt.apartment_number}`);
  return parts.join(' · ');
}

export function listUniqueBuildings<T extends { building_id: string; building_name: string }>(
  apartments: T[],
): Array<{ id: string; name: string }> {
  const map = new Map<string, string>();
  for (const apt of apartments) {
    if (!map.has(apt.building_id)) {
      map.set(apt.building_id, apt.building_name);
    }
  }

  return Array.from(map, ([id, name]) => ({ id, name })).sort((a, b) =>
    a.name.localeCompare(b.name, 'mn'),
  );
}
