import { useEffect, useMemo, useRef } from "react";
import { useIndoorNavigationStore } from "@/hooks/useIndoorNavigationStore";
import { useIndoorMultiFloorPath } from "@/hooks/queries/indoorDirectionsQueries";
import { useGetBuildingFloors } from "@/hooks/queries/indoorMapQueries";
import type { SelectedPoint } from "@/hooks/useIndoorNavigationStore";
import type { FloorSegment } from "@/hooks/queries/indoorDirectionsQueries";

const makeKey = (buildingCode: string, s: SelectedPoint, e: SelectedPoint) =>
  `${buildingCode}:${s.floor}:${s.coord.x},${s.coord.y}->${e.floor}:${e.coord.x},${e.coord.y}`;

/**
 * Tune this once so the numbers "feel" like meters.
 * If see too small: increase it. Too big: decrease it.
 */
const METERS_PER_SVG_UNIT = 0.022;

/**
 * Extract SVG width/height from xml. Works with:
 * - viewBox="0 0 W H"
 * - width="..." height="..."
 */
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
    // fallback if we can't parse: assume 1000x1000
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

export function useIndoorItineraryController(buildingCode: string) {
  const nav = useIndoorNavigationStore();
  const mutation = useIndoorMultiFloorPath();

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
      .then(async (res) => {
        const svgSizeByFloor: Record<number, { width: number; height: number } | null> =
          {};

        const floors = floorsData?.floors ?? [];
        await Promise.all(
          floors.map(async (f) => {
            svgSizeByFloor[f.number] = await getSvgSizeFromImgPath(f.imgPath);
          }),
        );

        const meters = computeMetersFromSegments(res.segments, svgSizeByFloor);

        nav.setRoute(res.segments, meters);
      })
      .catch(() => {
        nav.clearRoute();
      });
  }, [canRequestRoute, buildingCode, nav.start, nav.end, nav, mutation, floorsData]);

  return {
    mode: nav.mode,
    enterItineraryFromSelected: nav.enterItineraryFromSelected,
    exitItinerary: nav.exitItinerary,

    pickMode: nav.pickMode,
    start: nav.start,
    end: nav.end,

    routeSegments: nav.routeSegments,
    totalDistance: nav.totalDistance,

    isLoadingRoute: mutation.isPending,
    onPickPoint,
  };
}