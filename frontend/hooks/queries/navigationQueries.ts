import { useQuery } from "@tanstack/react-query";
import { api } from "../api";
import {
  IndoorNavigableLocation,
  NavigableLocation,
  OutdoorNavigableLocation,
} from "../useNavigationStore";
import { Point } from "./buildingQueries";
import { MultiFloorPathResult } from "./indoorDirectionsQueries";

export const TransitMode = {
  driving: "driving",
  transit: "transit",
  walking: "walking",
  bicycling: "bicycling",
  shuttle: "shuttle",
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

export const DirectionsResponseBlockType = {
  OUTDOOR: "outdoor",
  INDOOR: "indoor",
  DURATION: "duration",
} as const;

export type DirectionsResponseBlockType =
  (typeof DirectionsResponseBlockType)[keyof typeof DirectionsResponseBlockType];

// matches the backend's RouteRequest, see direction_request.go
export type DirectionsRequestModel = {
  start:
    | Omit<IndoorNavigableLocation, "latitude" | "longitude">
    | OutdoorNavigableLocation;
  end:
    | Omit<IndoorNavigableLocation, "latitude" | "longitude">
    | OutdoorNavigableLocation;
  preferences: RoutePreferences;
};

export type RoutePreferences = {
  mode?: TransitMode;
  day?: string; // e.g. "Monday"
  time?: string; // e.g. "14:30"
  preferElevator?: boolean;
  requireAccessible?: boolean;
};

// returns the query key and params
export function prepareDirectionsQuery(
  startLocation: NavigableLocation,
  endLocation: NavigableLocation,
  startDateTime: Date,
): { queryKey: any[]; queryRequestBody: DirectionsRequestModel | null } {
  if (!startLocation || !endLocation || !startDateTime) {
    return {
      queryKey: ["directions", "disabled"],
      queryRequestBody: null,
    }; // handle by disabling the query in useGetDirections
  }

  // round to nearest minute
  const roundedStartTime = Math.round(startDateTime.getTime() / 60000) * 60000;

  let finalStartLocation = startLocation;
  let finalEndLocation = endLocation;

  if (startLocation && "building" in startLocation) {
    finalStartLocation = { ...startLocation };
    delete finalStartLocation.latitude;
    delete finalStartLocation.longitude;
  }

  if (endLocation && "building" in endLocation) {
    finalEndLocation = { ...endLocation };
    delete finalEndLocation.latitude;
    delete finalEndLocation.longitude;
  }

  const queryRequestBody: DirectionsRequestModel = {
    start: finalStartLocation,
    end: finalEndLocation,
    preferences: {},
  };

  // it would be nice if locations had IDs, but i'm hoping that we won't have clashing names.
  return {
    queryKey: [
      "directions",
      startLocation.name,
      endLocation.name,
      roundedStartTime,
    ],
    queryRequestBody,
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
  durationBlock: DurationBlockModel;
  directionBlocks: DirectionsResponseBlockModel[];
};

export type OutdoorDirectionsModel = {
  mode: string;
  duration: string; // e.g. "15 mins"
  distance: string; // e.g. "1.2km"
  departure_message: string;
  polyline: string; // encoded polyline string representing the ENTIRE route
  steps: StepModel[];
};

export type DirectionsResponseBlockModel =
  | OutdoorDirectionsBlockModel
  | IndoorDirectionsBlockModel
  | DurationBlockModel;

export type OutdoorDirectionsBlockModel = {
  type: "outdoor";
  directionsByMode: Record<string, OutdoorDirectionsModel>; // maps a transit mode (e.g. "walking", "shuttle") to its corresponding directions model
  sequenceNumber?: number; // indicates the order of this block in the overall directions.
};

export type IndoorDirectionsBlockModel = {
  type: "indoor";
  directions: MultiFloorPathResult;
  sequenceNumber?: number; // indicates the order of this block in the overall directions.
};

export type DurationBlockModel = {
  type: "duration";
  durations: Record<string, number>; // e.g. { "walking": 5, "driving": 2 } where time is in seconds.
};

export const useGetDirections = (
  startLocation: NavigableLocation,
  endLocation: NavigableLocation,
  startDateTime: Date,
) => {
  const { queryRequestBody, queryKey } = prepareDirectionsQuery(
    startLocation,
    endLocation,
    startDateTime,
  );
  const query = useQuery<DirectionsModel>({
    queryKey,
    queryFn: async () => {
      const apiClient = await api();
      return apiClient
        .url("/directions")
        .post(queryRequestBody)
        .json<DirectionsModel>((res) => {
          return apiResponseToDirectionsModel(res);
        })
        .catch((error) => {
          console.error("Error fetching directions:", error);
          throw error;
        });
    },
    staleTime: Infinity,
    enabled: !!startLocation && !!endLocation && !!startDateTime,
    retry: 1,
  });

  return query;
};

// converts the raw API response to the DirectionsModel used in the frontend.
// the backend response has a lot of fields marked as "body" which aren't very descriptive,
// so this function also adds more meaningful field names and
// structures the data in a way that's easier for the frontend to consume.
const apiResponseToDirectionsModel = (response: any): DirectionsModel => {
  if (response.error) {
    return null;
  }

  let directionBlocks: DirectionsResponseBlockModel[] = [];
  let durationBlock: DurationBlockModel = null;

  // parse blocks. the backend returns an array of blocks,
  // where each block can be either "outdoor", "indoor", or "duration" type.
  response.forEach((block: any, index: number) => {
    switch (block.type) {
      case DirectionsResponseBlockType.OUTDOOR: {
        let directionsByMode: Record<string, OutdoorDirectionsModel> = {};
        block.body.forEach((singleModeDirections: OutdoorDirectionsModel) => {
          directionsByMode[singleModeDirections.mode] = singleModeDirections;
        });
        directionBlocks.push({
          type: DirectionsResponseBlockType.OUTDOOR,
          directionsByMode,
          sequenceNumber: index,
        } as OutdoorDirectionsBlockModel);
        break;
      }
      case DirectionsResponseBlockType.INDOOR:
        directionBlocks.push({
          type: DirectionsResponseBlockType.INDOOR,
          directions: block.body as MultiFloorPathResult,
          sequenceNumber: index,
        } as IndoorDirectionsBlockModel);

        break;

      // duration is always returned as the last one
      case DirectionsResponseBlockType.DURATION: {
        durationBlock = {
          type: DirectionsResponseBlockType.DURATION,
          durations: block.body as Record<string, number>,
        };
      }
    }
  });
  return { durationBlock, directionBlocks };
};
