/**
 * This entire file was highly vibe coded by the original author.
 * There's quite literally 0 explanations as to what any of these functions do
 * There's just a single exported functions that generates a certain format of indoor navigation steps
 * from the backend's response segments.
 * 
 * I don't know how it works. I don't think the original author does either.
 * Integrating the indoor directions with the outdoor ones (for #178) was a huge pain because of how
 * unmaintainable the indoor navigation is. Thanks a lot.
 * @author of this comment: @eplxy
 */

import type {
  Coordinates,
  FloorSegment,
  TransitionType,
} from "@/hooks/queries/indoorDirectionsQueries";
import type { Floor } from "@/hooks/queries/indoorMapQueries";

const METERS_PER_SVG_UNIT = 0.022;
const WALKING_SPEED_MPS = 1.3;

export type NavigationStepKind = "turn" | "transition" | "arrival" | "walk";

export type IndoorNavigationStep = {
  id: string;
  floorNumber: number;
  targetPoint: Coordinates;
  kind: NavigationStepKind;
  iconName:
    | "arrow-forward"
    | "arrow-undo"
    | "arrow-redo"
    | "swap-vertical"
    | "walk"
    | "location";
  instruction: string;
  distanceMeters: number;
  remainingDistanceMeters: number;
};

function parseSvgSize(xml: string): { width: number; height: number } | null {
  const viewBoxRegex = /viewBox\s*=\s*"[^"]*?\s([\d.]+)\s([\d.]+)"/i;
  const widthRegex = /width\s*=\s*"([\d.]+)"/i;
  const heightRegex = /height\s*=\s*"([\d.]+)"/i;

  const viewBoxMatch = viewBoxRegex.exec(xml);
  if (viewBoxMatch) {
    return { width: Number(viewBoxMatch[1]), height: Number(viewBoxMatch[2]) };
  }

  const wMatch = widthRegex.exec(xml);
  const hMatch = heightRegex.exec(xml);
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

function pointDistanceMeters(
  a: Coordinates,
  b: Coordinates,
  size: { width: number; height: number } | null,
) {
  const W = size?.width ?? 1000;
  const H = size?.height ?? 1000;

  const dx = (b.x - a.x) * W;
  const dy = (b.y - a.y) * H;
  return Math.hypot(dx, dy) * METERS_PER_SVG_UNIT;
}

function sumSlice(values: number[], start: number, endInclusive: number) {
  let total = 0;
  for (let i = start; i <= endInclusive; i++) {
    total += values[i] ?? 0;
  }
  return total;
}

function detectTurn(
  prev: Coordinates,
  curr: Coordinates,
  next: Coordinates,
): "left" | "right" | "straight" {
  const dx1 = curr.x - prev.x;
  const dy1 = curr.y - prev.y;
  const dx2 = next.x - curr.x;
  const dy2 = next.y - curr.y;

  const mag1 = Math.hypot(dx1, dy1);
  const mag2 = Math.hypot(dx2, dy2);
  if (mag1 < 1e-8 || mag2 < 1e-8) return "straight";

  const cross = dx1 * dy2 - dy1 * dx2;
  const dot = dx1 * dx2 + dy1 * dy2;
  const cos = Math.max(-1, Math.min(1, dot / (mag1 * mag2)));
  const angleDeg = (Math.acos(cos) * 180) / Math.PI;

  if (angleDeg < 20) return "straight";

  return cross < 0 ? "left" : "right";
}

function instructionForTurn(turn: "left" | "right") {
  return turn === "left"
    ? {
        iconName: "arrow-undo" as const,
        instruction: "Turn left at next intersection",
      }
    : {
        iconName: "arrow-redo" as const,
        instruction: "Turn right at next intersection",
      };
}

function formatDurationMinutes(distanceMeters: number) {
  return Math.max(1, Math.round(distanceMeters / WALKING_SPEED_MPS / 60));
}

export function formatArrivalTimeFromNow(distanceMeters: number) {
  const now = new Date();
  const durationMinutes = formatDurationMinutes(distanceMeters);
  const arrival = new Date(now.getTime() + durationMinutes * 60 * 1000);

  const hh = arrival.getHours().toString().padStart(2, "0");
  const mm = arrival.getMinutes().toString().padStart(2, "0");

  return `${hh}:${mm}`;
}

export function estimateDurationMinutes(distanceMeters: number) {
  return formatDurationMinutes(distanceMeters);
}

function buildSvgSizeByFloor(
  floors?: Floor[] | null,
): Promise<Record<number, { width: number; height: number } | null>> {
  const svgSizeByFloor: Record<number, { width: number; height: number } | null> =
    {};
  const safeFloors = floors ?? [];

  return Promise.all(
    safeFloors.map(async (floor) => {
      svgSizeByFloor[floor.number] = await getSvgSizeFromImgPath(floor.imgPath);
    }),
  ).then(() => svgSizeByFloor);
}

function buildEdgeMeters(
  pts: Coordinates[],
  floorSize: { width: number; height: number } | null,
) {
  const edgeMeters: number[] = [];
  for (let i = 1; i < pts.length; i++) {
    edgeMeters.push(pointDistanceMeters(pts[i - 1], pts[i], floorSize));
  }
  return edgeMeters;
}

function getTransitionInstruction(
  transitionType: TransitionType | null,
  nextFloor: number,
) {
  if (transitionType === 1) {
    return `Take the stairs to Floor ${nextFloor}`;
  }
  if (transitionType === 2) {
    return `Take the elevator to Floor ${nextFloor}`;
  }
  return `Go to Floor ${nextFloor}`;
}

function addTurnSteps(params: {
  rawSteps: Omit<IndoorNavigationStep, "remainingDistanceMeters">[];
  pts: Coordinates[];
  seg: FloorSegment;
  edgeMeters: number[];
  segmentIndex: number;
}) {
  const { rawSteps, pts, seg, edgeMeters, segmentIndex } = params;

  let anchorIndex = 0;
  let foundTurn = false;

  for (let i = 1; i < pts.length - 1; i++) {
    const turn = detectTurn(pts[i - 1], pts[i], pts[i + 1]);
    if (turn === "straight") continue;

    foundTurn = true;
    const distToTurn = sumSlice(edgeMeters, anchorIndex, i - 1);

    if (distToTurn > 0.2) {
      const turnInfo = instructionForTurn(turn);
      rawSteps.push({
        id: `turn-${segmentIndex}-${i}`,
        floorNumber: seg.floorNumber,
        targetPoint: pts[i],
        kind: "turn",
        iconName: turnInfo.iconName,
        instruction: turnInfo.instruction,
        distanceMeters: distToTurn,
      });
      anchorIndex = i;
    }
  }

  return { anchorIndex, foundTurn };
}

function addTransitionStep(params: {
  rawSteps: Omit<IndoorNavigationStep, "remainingDistanceMeters">[];
  seg: FloorSegment;
  segmentIndex: number;
  segments: FloorSegment[];
  transitionType: TransitionType | null;
  distToSegmentEnd: number;
  segmentEnd: Coordinates;
}) {
  const {
    rawSteps,
    seg,
    segmentIndex,
    segments,
    transitionType,
    distToSegmentEnd,
    segmentEnd,
  } = params;

  const nextFloor = segments[segmentIndex + 1].floorNumber;
  const transitionText = getTransitionInstruction(transitionType, nextFloor);

  rawSteps.push({
    id: `transition-${segmentIndex}`,
    floorNumber: seg.floorNumber,
    targetPoint: segmentEnd,
    kind: "transition",
    iconName: "swap-vertical",
    instruction: transitionText,
    distanceMeters: Math.max(distToSegmentEnd, 0),
  });
}

function addLastSegmentSteps(params: {
  rawSteps: Omit<IndoorNavigationStep, "remainingDistanceMeters">[];
  seg: FloorSegment;
  segmentIndex: number;
  anchorIndex: number;
  foundTurn: boolean;
  distToSegmentEnd: number;
  segmentEnd: Coordinates;
}) {
  const {
    rawSteps,
    seg,
    segmentIndex,
    anchorIndex,
    foundTurn,
    distToSegmentEnd,
    segmentEnd,
  } = params;

  if (distToSegmentEnd > 0.2) {
    rawSteps.push({
      id: `walk-${segmentIndex}-${anchorIndex}`,
      floorNumber: seg.floorNumber,
      targetPoint: segmentEnd,
      kind: "walk",
      iconName: "walk",
      instruction: foundTurn ? "Continue straight" : "Head straight",
      distanceMeters: distToSegmentEnd,
    });
  }

  rawSteps.push({
    id: `arrival-${segmentIndex}`,
    floorNumber: seg.floorNumber,
    targetPoint: segmentEnd,
    kind: "arrival",
    iconName: "location",
    instruction: "You have arrived",
    distanceMeters: 0,
  });
}

function buildRawSteps(args: {
  segments: FloorSegment[];
  svgSizeByFloor: Record<number, { width: number; height: number } | null>;
  transitionType: TransitionType | null;
}) {
  const { segments, svgSizeByFloor, transitionType } = args;
  const rawSteps: Omit<IndoorNavigationStep, "remainingDistanceMeters">[] = [];

  for (let segmentIndex = 0; segmentIndex < segments.length; segmentIndex++) {
    const seg = segments[segmentIndex];
    const pts = seg.path ?? [];
    if (pts.length < 2) continue;

    const segmentEnd = pts.at(-1);
    if (!segmentEnd) continue;

    const floorSize = svgSizeByFloor[seg.floorNumber];
    const edgeMeters = buildEdgeMeters(pts, floorSize);

    const { anchorIndex, foundTurn } = addTurnSteps({
      rawSteps,
      pts,
      seg,
      edgeMeters,
      segmentIndex,
    });

    const distToSegmentEnd = sumSlice(
      edgeMeters,
      anchorIndex,
      edgeMeters.length - 1,
    );
    const isLastSegment = segmentIndex === segments.length - 1;

    if (isLastSegment) {
      addLastSegmentSteps({
        rawSteps,
        seg,
        segmentIndex,
        anchorIndex,
        foundTurn,
        distToSegmentEnd,
        segmentEnd,
      });
      continue;
    }

    addTransitionStep({
      rawSteps,
      seg,
      segmentIndex,
      segments,
      transitionType,
      distToSegmentEnd,
      segmentEnd,
    });
  }

  return rawSteps;
}

function scaleSteps(
  rawSteps: Omit<IndoorNavigationStep, "remainingDistanceMeters">[],
  exactTotalDistanceMeters?: number | null,
) {
  const computedTotal = rawSteps.reduce(
    (sum, step) => sum + step.distanceMeters,
    0,
  );

  const scale =
    exactTotalDistanceMeters && computedTotal > 0
      ? exactTotalDistanceMeters / computedTotal
      : 1;

  return rawSteps.map((step) => ({
    ...step,
    distanceMeters: step.distanceMeters * scale,
  }));
}

function addRemainingDistances(
  scaledSteps: Omit<IndoorNavigationStep, "remainingDistanceMeters">[],
): IndoorNavigationStep[] {
  let runningRemaining = 0;

  return [...scaledSteps]
    .reverse()
    .map((step) => {
      runningRemaining += step.distanceMeters;
      return {
        ...step,
        remainingDistanceMeters: runningRemaining,
      };
    })
    .reverse();
}

export async function buildIndoorNavigationSteps(args: {
  segments?: FloorSegment[] | null;
  floors?: Floor[] | null;
  transitionType: TransitionType | null;
  exactTotalDistanceMeters?: number | null;
}) {
  const { segments, floors, transitionType, exactTotalDistanceMeters } = args;

  const safeSegments = segments ?? [];
  if (safeSegments.length === 0) {
    return [];
  }

  const svgSizeByFloor = await buildSvgSizeByFloor(floors);
  const rawSteps = buildRawSteps({
    segments: safeSegments,
    svgSizeByFloor,
    transitionType,
  });

  if (rawSteps.length === 0) {
    return [];
  }

  const scaledSteps = scaleSteps(rawSteps, exactTotalDistanceMeters);
  return addRemainingDistances(scaledSteps);
}