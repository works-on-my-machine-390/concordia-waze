import { BUILDINGS_WITH_INDOOR_MAPS } from "../constants";

// this is hardcoded for now for convenience
// we do currently have a means of checking if a floor plan is available, but it involves querying and parsing building details
// and gets a bit lengthy, so for now (and for the duration of the project), this is alright
export const floorsWithMapsByBuildingCode: Record<
  (typeof BUILDINGS_WITH_INDOOR_MAPS)[number],
  number[]
> = {
  MB: [-2, 1],
  H: [1, 2, 8, 9],
  LB: [2, 3, 4, 5],
  VL: [1, 2, 3],
  CC: [1],
};

// overloaded function to check if a floor plan is available for a building or a specific floor in that building
export function isFloorPlanAvailable(buildingCode: string): boolean;
export function isFloorPlanAvailable(
  buildingCode: string,
  floor: number,
): boolean;
export function isFloorPlanAvailable(
  buildingCode: string,
  floor?: number,
): boolean {
  if (floor === undefined) {
    return BUILDINGS_WITH_INDOOR_MAPS.includes(
      buildingCode as (typeof BUILDINGS_WITH_INDOOR_MAPS)[number],
    );
  }

  const floors =
    floorsWithMapsByBuildingCode[
      buildingCode as keyof typeof floorsWithMapsByBuildingCode
    ];
  return floors ? floors.includes(floor) : false;
}
