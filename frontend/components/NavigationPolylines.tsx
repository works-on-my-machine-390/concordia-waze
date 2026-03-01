import { directionPolylineStyles } from "@/app/styles/directionStyles";
import { StepModel, useGetDirections } from "@/hooks/queries/navigationQueries";
import { useNavigationStore } from "@/hooks/useNavigationStore";
import polyline from "@mapbox/polyline";
import { useEffect, useMemo } from "react";
import { Marker, Polyline } from "react-native-maps";
import { TransitMode } from "./NavigationBottomSheet";

export type NavigationPolylinesProps = {
  showEndPoint?: boolean;
};

export default function NavigationPolylines(
  props: Readonly<NavigationPolylinesProps>,
) {
  const navigationState = useNavigationStore();

  const directionsQuery = useGetDirections(
    navigationState.startLocation,
    navigationState.endLocation,
    navigationState.transitMode,
    new Date(),
  );

  useEffect(() => {
    if (directionsQuery.data) {
      navigationState.setCurrentDirections(directionsQuery.data);
    }
  }, [directionsQuery.data]);

  const steps: StepModel[] = directionsQuery.data?.steps || [];

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

  const getStepStyling = (step: StepModel) => {
    const travelMode = step.travel_mode;

    if (travelMode === TransitMode.TRANSIT) {
      const transitType = step.transit_type;
      const transitLine = step.transit_line;

      if (transitType === "BUS") {
        return directionPolylineStyles.bus;
      } else if (transitType === "SUBWAY") {
        if (transitLine?.includes("1")) {
          return directionPolylineStyles.stmGreen;
        } else if (transitLine?.includes("2")) {
          return directionPolylineStyles.stmOrange;
        } else if (transitLine?.includes("5")) {
          return directionPolylineStyles.stmBlue;
        } else if (transitLine?.includes("4")) {
          return directionPolylineStyles.stmYellow;
        }

        return directionPolylineStyles.bus;
      }
    }

    if (
      Object.values(TransitMode).includes(
        travelMode.toUpperCase() as TransitMode,
      )
    ) {
      return (
        directionPolylineStyles[travelMode.toLowerCase()] ||
        directionPolylineStyles.walking
      );
    }
  };

  if (!directionsQuery.data) return null;

  return (
    <>
      {stepsWithDecodedPolylines.map((step, index) => (
        <Polyline
          key={step.polyline + index}
          strokeWidth={4}
          coordinates={step.decodedPolyline}
          {...getStepStyling(step)}
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
