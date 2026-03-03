import { useQueries, useQuery } from "@tanstack/react-query";
import { NavigableLocation } from "../useNavigationStore";
import { Point } from "./buildingQueries";
import { api } from "../api";
import { getIsCrossCampus } from "@/app/utils/mapUtils";
import { shouldRetry429 } from "@/app/utils/queryUtils";
import { QUERY_RETRY_DELAY_MS } from "@/app/constants";

export const TransitMode = {
  DRIVING: "DRIVING",
  TRANSIT: "TRANSIT",
  WALKING: "WALKING",
  BICYCLING: "BICYCLING",
  SHUTTLE: "SHUTTLE",
} as const;

export type TransitMode = (typeof TransitMode)[keyof typeof TransitMode];


export const TransitType = {
  BUS: "BUS",
  SUBWAY: "SUBWAY",
  TRAIN: "TRAIN",
  TRAM: "TRAM",
  WALKING: "WALKING", // technically not a transit type but shh
} as const;

export type TransitType = (typeof TransitType)[keyof typeof TransitType];

// returns the query key and params
export function prepareDirectionsQuery(
  startLocation: NavigableLocation,
  endLocation: NavigableLocation,
  mode: TransitMode,
  startDateTime: Date,
): { queryKey: any[]; queryParams: string } {
  if (!startLocation || !endLocation || !mode || !startDateTime) {
    return {
      queryKey: ["directions", "disabled", mode ?? "UNKNOWN"],
      queryParams: "",
    }; // handle by disabling the query in useGetDirections
  }

  // round to nearest minute
  const roundedStartTime = Math.round(startDateTime.getTime() / 60000) * 60000;

  const queryParams = new URLSearchParams({
    start_lat: startLocation.latitude.toString(),
    start_lng: startLocation.longitude.toString(),
    end_lat: endLocation.latitude.toString(),
    end_lng: endLocation.longitude.toString(),
    mode,
  }).toString();

  return {
    queryKey: [
      "directions",
      startLocation.latitude,
      startLocation.longitude,
      endLocation.latitude,
      endLocation.longitude,
      mode,
      roundedStartTime,
    ],
    queryParams,
  };
}

export type StepModel = {
  instruction: string; // e.g. "Walk to Universite Concordia / Campus Loyola"
  distance: string; // e.g. "0.1km"
  duration: string; // e.g. "2 mins"
  start: Point;
  end: Point;
  polyline: string;
} & StepModelExtension;

// all optional fields
type StepModelExtension = {
  arrival_stop?: string;
  arrival_time?: string;
  departure_stop?: string;
  departure_time?: string;
  maneuver?: string;
  num_stops?: number;
  polyline?: string;
  transit_headsign?: string;
  transit_line?: string;
  transit_type?: string;
  travel_mode?: string;
  transit_line_color?: string;
  transit_line_text_color?: string;
};

export type DirectionsModel = {
  mode: string;
  duration: string; // e.g. "15 mins"
  distance: string; // e.g. "1.2km"
  departure_message: string;
  polyline: string; // encoded polyline string representing the ENTIRE route
  steps: StepModel[];
};

export const useGetDirections = (
  startLocation: NavigableLocation,
  endLocation: NavigableLocation,
  mode: TransitMode,
  startDateTime: Date,
) => {
  const { queryKey, queryParams } = prepareDirectionsQuery(
    startLocation,
    endLocation,
    mode,
    startDateTime,
  );

  const query = useQuery<DirectionsModel>({
    queryKey,
    queryFn: async () => {
      const apiClient = await api();
      return apiClient
        .get(`/directions?${queryParams}`)
        .json<DirectionsModel>();
    },
    staleTime: Infinity,
    enabled: !!startLocation && !!endLocation && !!startDateTime && !!mode,
    retry: shouldRetry429,
    retryDelay: QUERY_RETRY_DELAY_MS,
  });

  return query;
};

export const useGetAllModesDirections = (
  startLocation: NavigableLocation,
  endLocation: NavigableLocation,
  startDateTime: Date,
) => {
  let modes = Object.values(TransitMode);
  if (getIsCrossCampus(startLocation, endLocation)) {
    modes = modes.filter((mode) => mode !== TransitMode.SHUTTLE);
  }

  const queries = useQueries({
    queries: modes.map((mode) => {
      const { queryKey, queryParams } = prepareDirectionsQuery(
        startLocation,
        endLocation,
        mode,
        startDateTime,
      );
      return {
        queryKey,
        queryFn: async () => {
          const apiClient = await api();
          return apiClient
            .get(`/directions?${queryParams}`)
            .json<DirectionsModel>();
        },
        staleTime: Infinity,
        enabled: !!startLocation && !!endLocation && !!startDateTime && !!mode,
        retry: shouldRetry429,
        retryDelay: QUERY_RETRY_DELAY_MS,
      };
    }),
  });

  return queries;
};
