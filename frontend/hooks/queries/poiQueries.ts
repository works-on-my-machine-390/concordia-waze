import { useQuery } from "@tanstack/react-query";
import { api } from "../api";
import { MapPOIQueryParamsModel } from "@/app/(drawer)/map";

export interface PoiSearchResultModel {
  code: string; // place id
  name: string;
  long_name: string; // unused
  address: string;
  latitude: number;
  longitude: number;
  metro_accessible: boolean; // unused
  services: string[];
  departments: null; // unused
  venues: null; // unused
  accessibility: null; // unused
}

export interface PoiSearchResponse {
  data: PoiSearchResultModel[];
}

export const TextSearchRankPreferenceType = {
  DISTANCE: "DISTANCE",
  RELEVANCE: "RELEVANCE",
} as const;
export type TextSearchRankPreferenceType =
  (typeof TextSearchRankPreferenceType)[keyof typeof TextSearchRankPreferenceType];

export const POI_DEFAULT_MAX_DISTANCE_IN_M = 1000; // different from the 1000 backend default, because 1km is really large honestly
export const POI_DEFAULT_RANK_PREFERENCE =
  TextSearchRankPreferenceType.RELEVANCE;

export const getPoiQueryKey = (params: MapPOIQueryParamsModel) => {
  const roundedLat = Math.round(Number.parseFloat(params.poiLat) * 1000) / 1000;
  const roundedLng = Math.round(Number.parseFloat(params.poiLng) * 1000) / 1000;
  const rankPreference = params.rankPref || POI_DEFAULT_RANK_PREFERENCE;
  return [
    "poi",
    "search",
    params.query,
    roundedLat,
    roundedLng,
    rankPreference,
  ];
};

export const useGetNearbyPoi = (
  query: string,
  lat: number,
  lng: number,
  rankPreference: TextSearchRankPreferenceType = POI_DEFAULT_RANK_PREFERENCE,
) => {
  return useQuery<PoiSearchResponse>({
    queryKey: getPoiQueryKey({
      query,
      poiLat: lat.toString(),
      poiLng: lng.toString(),
      rankPref: rankPreference,
    }),
    queryFn: async () => {
      const apiClient = await api();

      const rankPreferenceParam = `&rank_preference=${rankPreference}`;
      const paramsString = `input=${query}&lat=${lat}&lng=${lng}${rankPreferenceParam}`;

      return apiClient
        .get(`/pointofinterest?${paramsString}`)
        .json<PoiSearchResponse>();
    },
    staleTime: 1000 * 60 * 60 * 24, // 24 hours
    enabled: !!query && !Number.isNaN(lat) && !Number.isNaN(lng),
  });
};
