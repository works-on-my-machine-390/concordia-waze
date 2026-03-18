import { BUILDINGS_WITH_INDOOR_MAPS } from "../constants";

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

export const isFloorPlanAvailable = (buildingCode: string, floor: number) => {
  const floors =
    floorsWithMapsByBuildingCode[
      buildingCode as keyof typeof floorsWithMapsByBuildingCode
    ];
  return floors ? floors.includes(floor) : false;
};
