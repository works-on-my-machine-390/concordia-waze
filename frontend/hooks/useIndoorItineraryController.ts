import { useEffect, useMemo, useRef } from "react";
import { useIndoorNavigationStore } from "@/hooks/useIndoorNavigationStore";
import { useIndoorMultiFloorPath } from "@/hooks/queries/indoorDirectionsQueries";
import type { SelectedPoint } from "@/components/indoor/IndoorMapContainer";
import { useGetBuildingFloors } from "@/hooks/queries/indoorMapQueries";
import { useSvgDimensions } from "@/hooks/useSvgDimensions";

// small helper so we don't spam the backend
const makeKey = (buildingCode: string, s: SelectedPoint, e: SelectedPoint) =>
  `${buildingCode}:${s.floor}:${s.coord.x},${s.coord.y}->${e.floor}:${e.coord.x},${e.coord.y}`;

// ✅ pixels → meters calibration (frontend-only)
// You can tune these once and forget about it.
const PX_PER_METER_DEFAULT = 35;
const PX_PER_METER_BY_BUILDING: Record<string, number> = {
  VL: 32,
  MB: 35,
};
const pxPerMeter = (buildingCode: string) =>
  PX_PER_METER_BY_BUILDING[buildingCode] ?? PX_PER_METER_DEFAULT;

// ✅ compute length of a normalized path in SVG pixel space
function computePathPixels(
  path: { x: number; y: number }[],
  svgW: number,
  svgH: number,
) {
  if (!path || path.length < 2) return 0;

  let totalPx = 0;
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1];
    const b = path[i];
    const dx = (b.x - a.x) * svgW;
    const dy = (b.y - a.y) * svgH;
    totalPx += Math.sqrt(dx * dx + dy * dy);
  }
  return totalPx;
}

export function useIndoorItineraryController(buildingCode: string) {
  const nav = useIndoorNavigationStore();
  const mutation = useIndoorMultiFloorPath();

  // ✅ get floors so we can know imgPath for start/end floor
  const floorsQuery = useGetBuildingFloors(buildingCode);
  const floors = floorsQuery.data?.floors ?? [];

  const startFloorNum = nav.start?.floor ?? null;
  const endFloorNum = nav.end?.floor ?? null;

  const startFloor = startFloorNum != null ? floors.find(f => f.number === startFloorNum) : undefined;
  const endFloor = endFloorNum != null ? floors.find(f => f.number === endFloorNum) : undefined;

  // ✅ load svg dimensions for both floors (hooks are safe even if imgPath is undefined)
  const startSvg = useSvgDimensions(startFloor?.imgPath);
  const endSvg = useSvgDimensions(endFloor?.imgPath);

  // track last request key to avoid repeating calls
  const lastKeyRef = useRef<string | null>(null);

  const isItinerary = nav.mode === "ITINERARY";

  const onPickPoint = (p: SelectedPoint) => {
    if (!isItinerary) return;

    if (nav.pickMode === "start") {
      nav.setStart(p);
      nav.setPickMode("end");
      nav.clearRoute();
      lastKeyRef.current = null;
      return;
    }

    nav.setEnd(p);
    nav.clearRoute();
    lastKeyRef.current = null;
  };

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
      .then((res) => {
        // ✅ Pixel-based distance:
        // Sum segment pixel lengths using the correct SVG dimensions per floor.
        const startDims = startSvg.dimensions;
        const endDims = endSvg.dimensions;

        let totalPx = 0;

        for (const seg of res.segments ?? []) {
          // choose dims for this floor segment
          const dims =
            seg.floorNumber === startFloorNum ? startDims
            : seg.floorNumber === endFloorNum ? endDims
            : startDims ?? endDims; // fallback

          if (!dims) continue; // dims not loaded yet

          totalPx += computePathPixels(seg.path, dims.width, dims.height);
        }

        // If dims weren’t ready, fallback to normalized distance * rough factor
        const meters =
          totalPx > 0
            ? totalPx / pxPerMeter(buildingCode)
            : res.totalDistance * 120; // fallback

        nav.setRoute(res.segments, meters);
      })
      .catch(() => {
        nav.clearRoute();
      });
  }, [
    canRequestRoute,
    buildingCode,
    nav.start,
    nav.end,
    nav,
    mutation,
    startSvg.dimensions,
    endSvg.dimensions,
    startFloorNum,
    endFloorNum,
  ]);

  return {
    mode: nav.mode,
    enterItinerary: nav.enterItinerary,
    exitItinerary: nav.exitItinerary,

    pickMode: nav.pickMode,
    start: nav.start,
    end: nav.end,

    routeSegments: nav.routeSegments,
    totalDistance: nav.totalDistance, // now meters ✅

    isLoadingRoute:
      mutation.isPending ||
      floorsQuery.isLoading ||
      startSvg.isLoading ||
      endSvg.isLoading,

    onPickPoint,
  };
}