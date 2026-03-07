import { useEffect, useMemo, useRef } from "react";
import { useAccessibilityMode } from "@/hooks/useAccessibilityMode";
import { useIndoorNavigationStore } from "@/hooks/useIndoorNavigationStore";
import { useIndoorMultiFloorPath } from "@/hooks/queries/indoorDirectionsQueries";
import { useGetBuildingFloors } from "@/hooks/queries/indoorMapQueries";
import type { SelectedPoint } from "@/hooks/useIndoorNavigationStore";
import type { FloorSegment } from "@/hooks/queries/indoorDirectionsQueries";

const makeKey = (
  buildingCode: string,
  s: SelectedPoint,
  e: SelectedPoint,
  preferElevator: boolean,
) =>
  `${buildingCode}:${s.floor}:${s.coord.x},${s.coord.y}->${e.floor}:${e.coord.x},${e.coord.y}:elevator=${preferElevator}`;

const METERS_PER_SVG_UNIT = 0.022;

function parseSvgSize(xml: string): { width: number; height: number } | null {
  const viewBoxMatch = xml.match(/viewBox\s*=\s*"[^"]*?\s([\d.]+)\s([\d.]+)"/i);
  if (viewBoxMatch) {
    return { width: Number(viewBoxMatch[1]), height: Number(viewBoxMatch[2]) };
  }

  const wMatch = xml.match(/width\s*=\s*"([\d.]+)"/i);
  const hMatch = xml.match(/height\s*=\s*"([\d.]+)"/i);
  if (wMatch && hMatch) {
    return { width: Number(wMatch[1]), height: Number(hMatch[1]) };
  }

  return null;
}

async function getSvgSizeFromImgPath(imgPath?: string) {
  if (!imgPath) return null;

  try {
    const res = await fetch(imgPath);
    const xml = await res.text();
    return parseSvgSize(xml);
  } catch {
    return null;
  }
}

function computeMetersFromSegments(
  segments: FloorSegment[],
  svgSizeByFloor: Record<number, { width: number; height: number } | null>,
) {
  let totalSvgUnits = 0;

  for (const seg of segments) {
    const size = svgSizeByFloor[seg.floorNumber];
    const W = size?.width ?? 1000;
    const H = size?.height ?? 1000;

    const pts = seg.path ?? [];
    for (let i = 1; i < pts.length; i++) {
      const dx = (pts[i].x - pts[i - 1].x) * W;
      const dy = (pts[i].y - pts[i - 1].y) * H;
      totalSvgUnits += Math.sqrt(dx * dx + dy * dy);
    }
  }

  return totalSvgUnits * METERS_PER_SVG_UNIT;
}

function isNoAccessibleRouteError(error: unknown): boolean {
  if (!error) return false;

  if (error instanceof Error) {
    return error.message.toLowerCase().includes("no transition point");
  }

  const raw = typeof error === "string" ? error : JSON.stringify(error);
  return raw.toLowerCase().includes("no transition point");
}

export function useIndoorItineraryController(buildingCode: string) {
  const nav = useIndoorNavigationStore();
  const mutation = useIndoorMultiFloorPath();
  const { isAccessibilityMode } = useAccessibilityMode();

  const { data: floorsData } = useGetBuildingFloors(buildingCode);

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

    const key = makeKey(
      buildingCode,
      nav.start,
      nav.end,
      isAccessibilityMode,
    );

    if (lastKeyRef.current === key) return;
    lastKeyRef.current = key;

    nav.setRouteError(null);

    mutation
      .mutateAsync({
        buildingCode,
        startFloor: nav.start.floor,
        endFloor: nav.end.floor,
        start: nav.start.coord,
        end: nav.end.coord,
        preferElevator: isAccessibilityMode,
      })
      .then(async (res) => {
        const svgSizeByFloor: Record<
          number,
          { width: number; height: number } | null
        > = {};

        const floors = floorsData?.floors ?? [];
        await Promise.all(
          floors.map(async (f) => {
            svgSizeByFloor[f.number] = await getSvgSizeFromImgPath(f.imgPath);
          }),
        );

        const meters = computeMetersFromSegments(res.segments, svgSizeByFloor);

        nav.setRoute(res.segments, meters, res.transitionType);
      })
      .catch((error) => {
        nav.clearRoute();

        if (isAccessibilityMode && isNoAccessibleRouteError(error)) {
          nav.setRouteError("No accessible indoor route is available for this trip.");
          return;
        }

        nav.setRouteError("Unable to generate an indoor route.");
      });
  }, [
    canRequestRoute,
    buildingCode,
    nav.start,
    nav.end,
    nav,
    mutation,
    floorsData,
    isAccessibilityMode,
  ]);

  return {
    mode: nav.mode,
    enterItineraryFromSelected: nav.enterItineraryFromSelected,
    exitItinerary: nav.exitItinerary,

    pickMode: nav.pickMode,
    start: nav.start,
    end: nav.end,

    routeSegments: nav.routeSegments,
    totalDistance: nav.totalDistance,
    transitionType: nav.transitionType,
    routeError: nav.routeError,

    isLoadingRoute: mutation.isPending,
    onPickPoint,
  };
}