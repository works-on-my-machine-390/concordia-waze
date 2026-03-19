export function dist2(ax: number, ay: number, bx: number, by: number) {
  const dx = bx - ax;
  const dy = by - ay;
  return dx * dx + dy * dy;
}

export function orthogonalizePath(points: { x: number; y: number }[]) {
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

export function simplifyOrthogonalPath(points: { x: number; y: number }[]) {
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

export function createDottedPathPoints(
  points: { x: number; y: number }[],
  spacing = 7,
) {
  const dottedPoints: { x: number; y: number }[] = [];

  if (points.length <= 1) {
    return dottedPoints;
  }

  let carry = 0;

  for (let i = 1; i < points.length; i++) {
    const start = points[i - 1];
    const end = points[i];
    const segmentLength = Math.sqrt(dist2(start.x, start.y, end.x, end.y));

    if (segmentLength <= 0.001) {
      continue;
    }

    let t = i === 1 ? 0 : (spacing - carry) / segmentLength;

    while (t <= 1) {
      dottedPoints.push({
        x: start.x + (end.x - start.x) * t,
        y: start.y + (end.y - start.y) * t,
      });
      t += spacing / segmentLength;
    }

    const lastT = t - spacing / segmentLength;
    const usedLength = segmentLength * lastT;
    carry = segmentLength - usedLength;

    if (carry < 0 || carry >= spacing) {
      carry = 0;
    }
  }

  const lastPoint = points.at(-1);
  if (
    lastPoint &&
    !dottedPoints.some(
      (point) => dist2(point.x, point.y, lastPoint.x, lastPoint.y) < 0.0001,
    )
  ) {
    dottedPoints.push(lastPoint);
  }

  return dottedPoints;
}

/**
 * Used in IndoorPathOverlay.tsx.
 * Ensures that the step index is always within the bounds of the available steps to prevent crashes due to out-of-bounds access.
 * Matches the one in ActiveNavigationIndoorHeaderContent.tsx to ensure consistency in how indoor step indices are handled across the app.
 * @param requestedIndex The step index that is being requested, which may be out of bounds or undefined.
 * @param totalSteps The total number of steps available in the current navigation context, used to determine the valid range for the step index.
 * @returns A safe step index that is guaranteed to be within the bounds of 0 and totalSteps - 1, ensuring that any access to steps using this index will not result in out-of-bounds errors.
 */
export function getSafeStepIndex(
  requestedIndex: number | undefined,
  totalSteps: number,
) {
  if (totalSteps <= 0) {
    return 0;
  }

  const normalizedRequested = requestedIndex ?? 0;
  return Math.min(Math.max(normalizedRequested, 0), totalSteps - 1);
}

/**
 * Used in IndoorPathOverlay.tsx to determine the current segment index based on the step ID format.
 */
export function getSegmentIndexFromStepId(stepId?: string) {
  if (!stepId) return undefined;

  const match = /^[^-]+-(\d+)/.exec(stepId);
  if (!match) return undefined;

  return Number(match[1]);
}

/**
 * Utility function for finding the index of the closest point in a path to a given target point.
 * Used in IndoorPathOverlay.tsx to determine how much of the path has been completed based on the user's current position.
 */
export function getClosestPointIndex(
  path: { x: number; y: number }[],
  target: {
    x: number;
    y: number;
  },
) {
  let closestIndex = 0;
  let closestDistance = Number.POSITIVE_INFINITY;

  for (let i = 0; i < path.length; i++) {
    const dx = path[i].x - target.x;
    const dy = path[i].y - target.y;
    const distance = dx * dx + dy * dy;

    if (distance < closestDistance) {
      closestDistance = distance;
      closestIndex = i;
    }
  }

  return closestIndex;
}
