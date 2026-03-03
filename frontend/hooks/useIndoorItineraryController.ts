import { useEffect, useMemo, useRef } from "react";
import { useIndoorNavigationStore } from "@/hooks/useIndoorNavigationStore";
import { useIndoorMultiFloorPath } from "@/hooks/queries/indoorDirectionsQueries";

// small helper so we don't spam the backend
const makeKey = (buildingCode: string, s: any, e: any) =>
  `${buildingCode}:${s.floor}:${s.coord.x},${s.coord.y}->${e.floor}:${e.coord.x},${e.coord.y}`;

export function useIndoorItineraryController(buildingCode: string) {
  const nav = useIndoorNavigationStore();
  const mutation = useIndoorMultiFloorPath();

  const lastKeyRef = useRef<string | null>(null);
  const isItinerary = nav.mode === "ITINERARY";

  const canRequestRoute = useMemo(() => {
    return !!buildingCode && !!nav.start && !!nav.end && isItinerary;
  }, [buildingCode, nav.start, nav.end, isItinerary]);

  useEffect(() => {
    if (!canRequestRoute || !nav.start || !nav.end) return;

    const key = makeKey(buildingCode, nav.start, nav.end);
    if (lastKeyRef.current === key) return;

    lastKeyRef.current = key;

    mutation
      .mutateAsync({
        buildingCode,
        startFloor: nav.start.floor,
        endFloor: nav.end.floor,
        start: nav.start.coord,
        end: nav.end.coord,
        preferElevator: false,
      })
      .then((res) => nav.setRoute(res.segments, res.totalDistance))
      .catch(() => nav.clearRoute());
  }, [canRequestRoute, buildingCode, nav.start, nav.end, nav, mutation]);

  return {
    mode: nav.mode,
    start: nav.start,
    end: nav.end,
    routeSegments: nav.routeSegments,
    totalDistance: nav.totalDistance,
    isLoadingRoute: mutation.isPending,
  };
}