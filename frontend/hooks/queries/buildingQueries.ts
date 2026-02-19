import { useQuery } from "@tanstack/react-query";
import { api } from "../api";

export const CampusCode = { SGW: "SGW", LOY: "LOY" } as const;
export type CampusCode = (typeof CampusCode)[keyof typeof CampusCode];

export type Point = {
  latitude: number;
  longitude: number;
};
export type CampusBuilding = {
  polygon: Point[];
  code: string;
};

export type GetBuildingsResponse = {
  campus: string;
  buildings: CampusBuilding[];
};

export const useGetBuildings = (campus: string) => {
  const query = useQuery<GetBuildingsResponse>({
    queryKey: ["buildings", campus],
    queryFn: async () => {
      const apiClient = await api();
      return apiClient
        .get(`/campuses/${campus}/buildings`)
        .json<GetBuildingsResponse>()
        .catch(
          () =>
            ({
              campus,
              buildings: [],
            }) as GetBuildingsResponse,
        );
    },
    staleTime: Infinity,
  });

  return query;
};

export type Building = {
  code: string;
  name: string;
  long_name: string;
  address: string;
  latitude: number;
  longitude: number;
  services: string[];
  departments: string[];
  venues: string[];
  accessibility: string[];
};

export const useGetBuildingDetails = (buildingCode: string) => {
  return useQuery<Building>({
    queryKey: ["buildingDetails", buildingCode],
    queryFn: async () => {
      const apiClient = await api();
      return apiClient.get(`/buildings/${buildingCode}`).json<Building>();
    },
    staleTime: Infinity,
    enabled: !!buildingCode
  });
};

export const useGetBuildingImages = (buildingCode: string) => {
  return useQuery<string[]>({
    queryKey: ["buildingImages", buildingCode],
    queryFn: async () => {
      const apiClient = await api();
      return apiClient
        .get(`/buildings/${buildingCode}/images`)
        .json<string[]>((res) => {
          return res.images;
        })
        .catch(() => [] as string[]);
    },
    staleTime: Infinity,
  });
};

// Types for the /buildings/list endpoint (used by Directory page)
export interface AllBuildingsResponse {
  buildings: {
    SGW: BuildingListItem[];
    LOY: BuildingListItem[];
  };
}

export interface BuildingListItem {
  name: string;
  long_name: string;
  code: string;
  campus: string;
}

// Hook to fetch all buildings for Directory page
export const useGetAllBuildings = () => {
  return useQuery<AllBuildingsResponse>({
    queryKey: ["buildings", "all"],
    queryFn: async () => {
      const apiClient = await api();
      return apiClient.get("/buildings/list").json<AllBuildingsResponse>();
    },
    staleTime: 1000 * 60 * 10,
  });
};