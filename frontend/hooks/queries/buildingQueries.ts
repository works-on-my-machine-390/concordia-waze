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

export type BuildingDetails = {
  address: string;
  code: string;
  departments: string[];
  latitude: number;
  long_name: string;
  longitude: number;
  name: string;
  services: string[];
};

export const useGetBuildingDetails = (buildingCode: string) => {
  return useQuery<BuildingDetails>({
    queryKey: ["buildingDetails", buildingCode],
    queryFn: async () => {
      const apiClient = await api();
      return apiClient
        .get(`/buildings/${buildingCode}`)
        .json<BuildingDetails>();
    },
    staleTime: Infinity,
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
