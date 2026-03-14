import { useQuery } from "@tanstack/react-query";
import { api } from "../api";

/**
 * Indoor map types
 */
export type Coordinate = {
  x: number;
  y: number;
};

export type NavigationEdge = {
  startVertex: number;
  endVertex: number;
};

export type PointOfInterest = {
  name: string;
  type: string; //for now, i just put it as a string, but when we get to rendering POIs on the map, we can have config file in app/constants (with name and icon for each POI) 
  position: Coordinate;
  polygon: Coordinate[]; //has polygon because this type includes rooms too, not just POIs
} & OutdoorExtension;

export type Floor = {
  name: string;
  number: number;
  imgPath: string;
  vertices: Coordinate[];
  edges: NavigationEdge[];
  pois: PointOfInterest[];
};

export type OutdoorExtension = {
  latitude: number;
  longitude: number;
  building: string;
}


export type BuildingFloors = {
  floors: Floor[];
}

export type ExtendedBuildingFloor = Floor & OutdoorExtension

/**
 * Hook to get building floors
 */
export const useGetBuildingFloors = (buildingCode: string) => {
  return useQuery<BuildingFloors>({
    queryKey: ["buildingFloors", buildingCode],
    queryFn: async () => {
      const apiClient = await api();
      return apiClient
        .get(`/buildings/floor/${buildingCode}`)
        .json<BuildingFloors>()
        .catch(() => ({ floors: [] }) as BuildingFloors);
    },
    staleTime: Infinity,
    enabled: !!buildingCode,
  });
};

/**
 * Indoor pathfinding types
 */
export type IndoorPathRequest = {
  buildingCode: string;
  startFloor: number;
  endFloor: number;
  start: Coordinate;
  end: Coordinate;
  startRoom?: string;
  endRoom?: string;
  requireAccessible?: boolean;
};

export type IndoorPathSegment = {
  floor: number;
  coordinates: Coordinate[];
};

export type IndoorPathResult = {
  segments: IndoorPathSegment[];
  transitionType: "stairs" | "elevator" | "none";
  totalDistance: number;
};

/**
 * Hook to get indoor path between two points
 * Pass null to disable
 */
export const useGetIndoorPath = (request: IndoorPathRequest | null) => {
  return useQuery<IndoorPathResult>({
    queryKey: [
      "indoorPath",
      request?.buildingCode,
      request?.startFloor,
      request?.endFloor,
      request?.start,
      request?.end,
      request?.startRoom,
      request?.endRoom,
      request?.requireAccessible,
    ],
    queryFn: async () => {
      const apiClient = await api();
      return apiClient
        .url("/directions/indoor/multi-floor-path")
        .post(request)
        .json<IndoorPathResult>();
    },
    staleTime: 0,
    enabled: !!request,
    retry: false,
  });
};
