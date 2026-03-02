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
};

export type Floor = {
  name: string;
  number: number;
  imgPath: string;
  vertices: Coordinate[];
  edges: NavigationEdge[];
  pois: PointOfInterest[];
};

export type BuildingFloors = {
  floors: Floor[];
};

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