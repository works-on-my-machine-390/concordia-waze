import { DIRECTION_COLORS } from "@/app/constants";
import { directionPolylineStyles } from "@/app/styles/directionStyles";
import {
  DirectionsResponseBlockType,
  StepModel,
  TransitMode,
} from "@/hooks/queries/navigationQueries";
import { useNavigationStore } from "@/hooks/useNavigationStore";
import polyline from "@mapbox/polyline";
import { useMemo } from "react";
import { Marker, Polyline } from "react-native-maps";
export type NavigationPolylinesProps = {
  showEndPoint?: boolean;
};

export default function NavigationPolylines(
  props: Readonly<NavigationPolylinesProps>,
) {
  const navigationState = useNavigationStore();
  const outdoorDirections =
    navigationState.currentDirections?.directionBlocks?.find(
      (block) => block.type === DirectionsResponseBlockType.OUTDOOR,
    )?.directionsByMode?.[navigationState.transitMode];
  const steps: StepModel[] = outdoorDirections?.steps || [];
  const currentStepIndex = navigationState.currentOutdoorStepIndex;

  const stepsWithDecodedPolylines = useMemo(() => {
    return steps.map((step) => {
      if (!step.polyline) return { ...step, decodedPolyline: [] };
      const decoded = polyline.decode(step.polyline);
      const decodedCoordinates = decoded.map((point: number[]) => ({
        latitude: point[0],
        longitude: point[1],
      }));
      return { ...step, decodedPolyline: decodedCoordinates };
    });
  }, [steps]);

  const getStepStyling = (step: StepModel, completed: boolean) => {
    const travelMode = step.travel_mode;

    // check first for travel mode transit, and apply the transit line color if available.
    if (travelMode.toLowerCase() === TransitMode.transit) {
      const color = completed
        ? DIRECTION_COLORS.completed
        : step.transit_line_color || DIRECTION_COLORS.transit;
      return {
        ...directionPolylineStyles.transit,
        strokeColor: color,
        fillColor: color,
      };
    }

    if (
      Object.values(TransitMode).includes(
        travelMode.toLowerCase() as TransitMode,
      )
    ) {
      const color = completed
        ? DIRECTION_COLORS.completed
        : DIRECTION_COLORS[
            travelMode.toLowerCase() as keyof typeof DIRECTION_COLORS
          ] || DIRECTION_COLORS.walking; // default to walking color if specific mode color is not defined
      return {
        ...(directionPolylineStyles[travelMode.toLowerCase()] ||
          directionPolylineStyles.walking),
        strokeColor: color,
        fillColor: color,
      };
    }
  };

  const isStepCompleted = (index: number) => {
    if (navigationState.currentOutdoorStepIndex === undefined) return false;

    return currentStepIndex !== undefined && index < currentStepIndex;
  };

  if (!outdoorDirections) return null;

  return (
    <>
      {stepsWithDecodedPolylines.map((step, index) => (
        <Polyline
          key={step.polyline + index}
          strokeWidth={4}
          coordinates={step.decodedPolyline}
          {...getStepStyling(step, isStepCompleted(index))}
        />
      ))}
      {props.showEndPoint && (
        <Marker
          coordinate={{
            latitude: navigationState.endLocation.latitude,
            longitude: navigationState.endLocation.longitude,
          }}
        />
      )}
    </>
  );
}
