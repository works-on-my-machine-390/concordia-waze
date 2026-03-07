import type {
  Coordinates,
  FloorSegment,
  TransitionType,
} from "@/hooks/queries/indoorDirectionsQueries";
import type { Floor } from "@/hooks/queries/indoorMapQueries";

const METERS_PER_SVG_UNIT = 0.022;
const WALKING_SPEED_MPS = 1.3;

export type NavigationStepKind = "turn" | "transition" | "arrival";

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

function pointDistanceMeters(
  a: Coordinates,
  b: Coordinates,
  size: { width: number; height: number } | null,
) {
  const W = size?.width ?? 1000;
  const H = size?.height ?? 1000;

  const dx = (b.x - a.x) * W;
  const dy = (b.y - a.y) * H;
  return Math.sqrt(dx * dx + dy * dy) * METERS_PER_SVG_UNIT;
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

  const mag1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);
  const mag2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
  if (mag1 < 1e-8 || mag2 < 1e-8) return "straight";

  const cross = dx1 * dy2 - dy1 * dx2;
  const dot = dx1 * dx2 + dy1 * dy2;
  const cos = dot / (mag1 * mag2);

  if (Math.abs(cross) < 1e-6 || cos > 0.995) return "straight";

  // screen coords: y grows downward, so sign is visually flipped
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

export async function buildIndoorNavigationSteps(args: {
  segments: FloorSegment[];
  floors: Floor[];
  transitionType: TransitionType | null;
  exactTotalDistanceMeters?: number | null;
}) {
  const { segments, floors, transitionType, exactTotalDistanceMeters } = args;

  const svgSizeByFloor: Record<number, { width: number; height: number } | null> =
    {};

  await Promise.all(
    floors.map(async (f) => {
      svgSizeByFloor[f.number] = await getSvgSizeFromImgPath(f.imgPath);
    }),
  );

  const rawSteps: Omit<IndoorNavigationStep, "remainingDistanceMeters">[] = [];

  for (let sIdx = 0; sIdx < segments.length; sIdx++) {
    const seg = segments[sIdx];
    const pts = seg.path ?? [];
    if (pts.length < 2) continue;

    const floorSize = svgSizeByFloor[seg.floorNumber];
    const edgeMeters: number[] = [];

    for (let i = 1; i < pts.length; i++) {
      edgeMeters.push(pointDistanceMeters(pts[i - 1], pts[i], floorSize));
    }

    let anchorIndex = 0;

    for (let i = 1; i < pts.length - 1; i++) {
      const turn = detectTurn(pts[i - 1], pts[i], pts[i + 1]);
      if (turn === "straight") continue;

      const distToTurn = sumSlice(edgeMeters, anchorIndex, i - 1);
      if (distToTurn > 0.2) {
        const turnInfo = instructionForTurn(turn);
        rawSteps.push({
          id: `turn-${sIdx}-${i}`,
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

    const distToSegmentEnd = sumSlice(edgeMeters, anchorIndex, edgeMeters.length - 1);

    if (sIdx < segments.length - 1) {
      const nextFloor = segments[sIdx + 1].floorNumber;

      let transitionText = `Go to Floor ${nextFloor}`;
      if (transitionType === 1) {
        transitionText = `Take the stairs to Floor ${nextFloor}`;
      } else if (transitionType === 2) {
        transitionText = `Take the elevator to Floor ${nextFloor}`;
      }

      rawSteps.push({
        id: `transition-${sIdx}`,
        floorNumber: seg.floorNumber,
        targetPoint: pts[pts.length - 1],
        kind: "transition",
        iconName: "swap-vertical",
        instruction: transitionText,
        distanceMeters: Math.max(distToSegmentEnd, 0),
      });
    } else {
      rawSteps.push({
        id: `arrival-${sIdx}`,
        floorNumber: seg.floorNumber,
        targetPoint: pts[pts.length - 1],
        kind: "arrival",
        iconName: "location",
        instruction: "You have arrived",
        distanceMeters: Math.max(distToSegmentEnd, 0),
      });
    }
  }

  if (rawSteps.length === 0) {
    return [];
  }

  const computedTotal = rawSteps.reduce((sum, step) => sum + step.distanceMeters, 0);
  const scale =
    exactTotalDistanceMeters && computedTotal > 0
      ? exactTotalDistanceMeters / computedTotal
      : 1;

  const scaled = rawSteps.map((step) => ({
    ...step,
    distanceMeters: step.distanceMeters * scale,
  }));

  let runningRemaining = 0;
  const finalSteps = [...scaled].reverse().map((step) => {
    runningRemaining += step.distanceMeters;
    return {
      ...step,
      remainingDistanceMeters: runningRemaining,
    };
  }).reverse();

  return finalSteps;
}