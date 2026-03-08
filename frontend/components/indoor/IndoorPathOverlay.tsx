import React, { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import type { Coordinates } from "@/hooks/queries/indoorDirectionsQueries";

type Props = {
  path: Coordinates[];
  width: number;
  height: number;
  endPolygon?: Coordinates[];
  startOverride?: Coordinates;
  endOverride?: Coordinates;
  color?: string;
};

function dist2(ax: number, ay: number, bx: number, by: number) {
  const dx = bx - ax;
  const dy = by - ay;
  return dx * dx + dy * dy;
}

function orthogonalizePath(points: { x: number; y: number }[]) {
  if (points.length < 2) return points;

  const out: { x: number; y: number }[] = [points[0]];

  for (let i = 1; i < points.length; i++) {
    const a = out.at(-1);
    const b = points[i];

    if (!a) continue;

    const dx = b.x - a.x;
    const dy = b.y - a.y;

    if (Math.abs(dx) < 0.001 || Math.abs(dy) < 0.001) {
      out.push(b);
      continue;
    }

    const elbow1 = { x: b.x, y: a.y };
    const elbow2 = { x: a.x, y: b.y };

    const preferHorizontalFirst = Math.abs(dx) >= Math.abs(dy);
    const elbow = preferHorizontalFirst ? elbow1 : elbow2;

    if (dist2(a.x, a.y, elbow.x, elbow.y) > 0.001) out.push(elbow);
    out.push(b);
  }

  return out;
}

function simplifyOrthogonalPath(points: { x: number; y: number }[]) {
  if (points.length <= 2) return points;

  const result = [points[0]];

  for (let i = 1; i < points.length - 1; i++) {
    const prev = result.at(-1);
    const curr = points[i];
    const next = points[i + 1];

    if (!prev) continue;

    const dx1 = curr.x - prev.x;
    const dy1 = curr.y - prev.y;
    const dx2 = next.x - curr.x;
    const dy2 = next.y - curr.y;

    const dir1x = Math.abs(dx1) > Math.abs(dy1) ? Math.sign(dx1) : 0;
    const dir1y = Math.abs(dy1) >= Math.abs(dx1) ? Math.sign(dy1) : 0;

    const dir2x = Math.abs(dx2) > Math.abs(dy2) ? Math.sign(dx2) : 0;
    const dir2y = Math.abs(dy2) >= Math.abs(dx2) ? Math.sign(dy2) : 0;

    if (dir1x !== dir2x || dir1y !== dir2y) {
      result.push(curr);
    }
  }

  const lastPoint = points.at(-1);
  if (lastPoint) result.push(lastPoint);

  return result;
}

function closestPointOnSegment(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
) {
  const abx = bx - ax;
  const aby = by - ay;
  const apx = px - ax;
  const apy = py - ay;

  const ab2 = abx * abx + aby * aby;
  if (ab2 < 1e-9) {
    return { x: ax, y: ay, t: 0 };
  }

  let t = (apx * abx + apy * aby) / ab2;
  if (t < 0) t = 0;
  if (t > 1) t = 1;

  return {
    x: ax + t * abx,
    y: ay + t * aby,
    t,
  };
}

function snapEndToClosestPolygonBorder(
  end: { x: number; y: number },
  polyPx: { x: number; y: number }[],
) {
  if (polyPx.length < 3) return end;

  let best = end;
  let bestD2 = Number.POSITIVE_INFINITY;

  for (let i = 0; i < polyPx.length; i++) {
    const a = polyPx[i];
    const b = polyPx[(i + 1) % polyPx.length];

    const c = closestPointOnSegment(end.x, end.y, a.x, a.y, b.x, b.y);
    const d2 = dist2(end.x, end.y, c.x, c.y);

    if (d2 < bestD2) {
      bestD2 = d2;
      best = { x: c.x, y: c.y };
    }
  }

  return best;
}

function trimPathFromStartOverride(
  pts: { x: number; y: number }[],
  startOverride?: { x: number; y: number },
) {
  if (!startOverride || pts.length < 2) return pts;

  let bestSegIdx = 0;
  let bestPoint = pts[0];
  let bestD2 = Number.POSITIVE_INFINITY;

  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    const c = closestPointOnSegment(
      startOverride.x,
      startOverride.y,
      a.x,
      a.y,
      b.x,
      b.y,
    );
    const d2 = dist2(startOverride.x, startOverride.y, c.x, c.y);

    if (d2 < bestD2) {
      bestD2 = d2;
      bestSegIdx = i - 1;
      bestPoint = { x: c.x, y: c.y };
    }
  }

  const trimmed = [bestPoint, ...pts.slice(bestSegIdx + 1)];

  if (trimmed.length >= 2) {
    const first = trimmed[0];
    const second = trimmed[1];
    if (dist2(first.x, first.y, second.x, second.y) < 0.0001) {
      trimmed.shift();
    }
  }

  return trimmed;
}

export default function IndoorPathOverlay({
  path,
  width,
  height,
  endPolygon,
  startOverride,
  endOverride,
  color = "#1E73FF",
}: Readonly<Props>) {
  const safePath = path ?? [];
  const hasRenderablePath = safePath.length >= 2;

  const adjustedPath = useMemo(() => {
    if (!hasRenderablePath) return [];

    const out = [...safePath];
    if (endOverride) out[out.length - 1] = endOverride;
    return out;
  }, [safePath, endOverride, hasRenderablePath]);

  const pts = useMemo(() => {
    if (!hasRenderablePath) return [];

    const scaled = adjustedPath.map((p) => ({
      x: p.x * width,
      y: p.y * height,
    }));
    const ortho = orthogonalizePath(scaled);
    const simplified = simplifyOrthogonalPath(ortho);

    const scaledStartOverride = startOverride
      ? { x: startOverride.x * width, y: startOverride.y * height }
      : undefined;

    return trimPathFromStartOverride(simplified, scaledStartOverride);
  }, [adjustedPath, width, height, startOverride, hasRenderablePath]);

  const finalPts = useMemo(() => {
    if (!hasRenderablePath || pts.length === 0) return [];
    if (!endPolygon || endPolygon.length < 3 || pts.length < 2) return pts;

    const polyPx = endPolygon.map((p) => ({
      x: p.x * width,
      y: p.y * height,
    }));

    const out = [...pts];
    const end = out.at(-1);

    if (!end) return out;

    out[out.length - 1] = snapEndToClosestPolygonBorder(end, polyPx);

    return out;
  }, [endPolygon, pts, width, height, hasRenderablePath]);

  const dots = useMemo(() => {
    const out: { x: number; y: number }[] = [];
    const spacing = 7;
    const radius = 2.5;

    if (finalPts.length <= 1) {
      return { points: out, radius };
    }

    let carry = 0;

    const dist = (a: { x: number; y: number }, b: { x: number; y: number }) =>
      Math.sqrt(dist2(a.x, a.y, b.x, b.y));

    for (let i = 1; i < finalPts.length; i++) {
      const a = finalPts[i - 1];
      const b = finalPts[i];
      const segLen = dist(a, b);
      if (segLen <= 0.001) continue;

      let t = i === 1 ? 0 : (spacing - carry) / segLen;

      while (t <= 1) {
        out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
        t += spacing / segLen;
      }

      const lastT = t - spacing / segLen;
      const used = segLen * lastT;
      carry = segLen - used;

      if (carry < 0) carry = 0;
      if (carry >= spacing) carry = 0;
    }

    const endPt = finalPts.at(-1);
    if (endPt) {
      out.push({ x: endPt.x, y: endPt.y });
    }

    return { points: out, radius };
  }, [finalPts]);

  if (!hasRenderablePath || finalPts.length === 0) return null;

  const start = finalPts[0];

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
        {dots.points.map((p) => (
          <Circle
            key={`dot-${p.x}-${p.y}`}
            cx={p.x}
            cy={p.y}
            r={dots.radius}
            fill={color}
          />
        ))}

        <Circle cx={start.x} cy={start.y} r={15} fill={color} opacity={0.25} />
        <Circle
          cx={start.x}
          cy={start.y}
          r={6}
          fill="none"
          stroke="#FFFFFF"
          strokeWidth={6}
        />
        <Circle cx={start.x} cy={start.y} r={7} fill={color} />
      </Svg>
    </View>
  );
}