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
