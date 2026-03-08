import { useMutation } from "@tanstack/react-query";
import { api } from "@/hooks/api";

export type Coordinates = { x: number; y: number };

export enum TransitionType {
  None = 0,
  Stairs = 1,
  Elevator = 2,
}

export type TurnDirection = "left" | "right" | "straight";

export type FloorSegment = {
  floorNumber: number;
  floorName?: string;
  distance: number;
  path: Coordinates[];
  directions?: TurnDirection[];
};

export type MultiFloorPathResult = {
  segments: FloorSegment[];
  totalDistance: number;
  transitionType: TransitionType;
};

export type MultiFloorPathRequest = {
  buildingCode: string;
  startFloor: number;
  endFloor: number;
  start: Coordinates;
  end: Coordinates;
  preferElevator?: boolean;
};

export function useIndoorMultiFloorPath() {
  return useMutation({
    mutationFn: async (body: MultiFloorPathRequest) => {
      const res = await (await api())
        .url("/directions/indoor/multi-floor-path")
        .post(body)
        .json<MultiFloorPathResult>();

      return res;
    },
  });
}