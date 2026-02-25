import { useQuery } from "@tanstack/react-query";
import { api } from "../api";

export interface PoiSearchResultModel {
  code: string;
  name: string;
  long_name: string;
  address: string;
  latitude: number;
  longitude: number;
  metro_accessible: boolean;
  services: string[];
  departments: null;
  venues: null;
  accessibility: null;
}

export interface PoiSearchResponse {
  data: PoiSearchResultModel[];
}

// TODO: experiment with grouping query keys by lat lng rounding
export const useGetNearbyPoi = (query: string, lat: number, lng: number) => {
  const roundedLat = Math.round(lat * 1000) / 1000;
  const roundedLng = Math.round(lng * 1000) / 1000;

  return useQuery<PoiSearchResponse>({
    queryKey: ["poi", "search", query, roundedLat, roundedLng],
    queryFn: async () => {
      const apiClient = await api();
      return apiClient
        .get(`/pointofinterest?input=${query}&lat=${roundedLat}&lng=${roundedLng}`)
        .json<PoiSearchResponse>();
    },
    staleTime: 1000 * 60 * 60 * 24, // 24 hours
  });
};
