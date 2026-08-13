"use client";

import { useEffect, useMemo, useState } from "react";
import { Label } from "@/components/ui/label";
import { erpSelectClassName } from "@/components/ui/erp-dialog";
import type { ApartmentAdminRow } from "@/lib/queries/apartments";
import { formatApartmentOptionLabel, listUniqueBuildings } from "@/lib/admin/apartment-label";

export function ApartmentBuildingSelect({
  apartments,
  defaultApartmentId,
  disabled = false,
  apartmentSelectDisabled = false,
}: {
  apartments: ApartmentAdminRow[];
  defaultApartmentId?: string;
  disabled?: boolean;
  apartmentSelectDisabled?: boolean;
}) {
  const initialApt = apartments.find((apt) => apt.id === defaultApartmentId);
  const [buildingId, setBuildingId] = useState(initialApt?.building_id ?? "");
  const [apartmentId, setApartmentId] = useState(defaultApartmentId ?? "");

  const buildings = useMemo(() => listUniqueBuildings(apartments), [apartments]);

  const apartmentsInBuilding = useMemo(() => {
    return apartments
      .filter((apt) => apt.building_id === buildingId)
      .sort((a, b) =>
        a.apartment_number.localeCompare(b.apartment_number, "mn", { numeric: true }),
      );
  }, [apartments, buildingId]);

  useEffect(() => {
    if (!buildingId && buildings.length === 1) {
      setBuildingId(buildings[0].id);
    }
  }, [buildingId, buildings]);

  useEffect(() => {
    if (!buildingId) return;
    const stillValid = apartmentsInBuilding.some((apt) => apt.id === apartmentId);
    if (!stillValid) {
      setApartmentId(apartmentsInBuilding[0]?.id ?? "");
    }
  }, [buildingId, apartmentId, apartmentsInBuilding]);

  function handleBuildingChange(nextBuildingId: string) {
    setBuildingId(nextBuildingId);
    const nextApartments = apartments.filter((apt) => apt.building_id === nextBuildingId);
    setApartmentId(nextApartments[0]?.id ?? "");
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="flex flex-col gap-2">
        <Label htmlFor="building_id">Барилга</Label>
        <select
          id="building_id"
          value={buildingId}
          onChange={(event) => handleBuildingChange(event.target.value)}
          required
          disabled={disabled}
          className={erpSelectClassName}
        >
          <option value="" disabled>
            Барилга сонгох...
          </option>
          {buildings.map((building) => (
            <option key={building.id} value={building.id}>
              {building.name}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="apartment_id">Орон сууц</Label>
        {apartmentSelectDisabled && apartmentId ? (
          <input type="hidden" name="apartment_id" value={apartmentId} />
        ) : null}
        <select
          id="apartment_id"
          name={apartmentSelectDisabled ? undefined : "apartment_id"}
          value={apartmentId}
          onChange={(event) => setApartmentId(event.target.value)}
          required
          disabled={disabled || apartmentSelectDisabled || !buildingId}
          className={`${erpSelectClassName} disabled:opacity-60`}
        >
          <option value="" disabled>
            Орон сууц сонгох...
          </option>
          {apartmentsInBuilding.map((apt) => (
            <option key={apt.id} value={apt.id}>
              {formatApartmentOptionLabel(apt)}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
