import json
import os
import re
import sys
import math
import numpy as np
from pathlib import Path

EPS = 1e-7

DATA_DIR    = Path(r"C:\Users\amal_\gitStuff\concordia-waze\campusFloormaps\Data") # enter appropriate path
OUTPUT_PATH = Path(r"C:\Users\amal_\gitStuff\concordia-waze\backend\resource\floor_information.json") # enter appropriate path

# ── Vec2 helpers ─────────────────────────────────────────────────────────────

def almost_equal_scalar(a, b, eps=EPS):
    return abs(a - b) <= eps

def almost_equal(a, b, eps=1e-6):
    return almost_equal_scalar(a[0], b[0], eps) and \
           almost_equal_scalar(a[1], b[1], eps)

def cross2(a, b, c):
    """(b-a) x (c-a)"""
    return (b[0]-a[0])*(c[1]-a[1]) - (b[1]-a[1])*(c[0]-a[0])

def dist2(a, b):
    return (a[0]-b[0])**2 + (a[1]-b[1])**2

# ── Segment intersection ─────────────────────────────────────────────────────

def segment_intersection(s1a, s1b, s2a, s2b):
    """
    Returns intersection point (x, y) if segments intersect, else None.
    """
    px, py = s1a
    rx, ry = s1b[0]-s1a[0], s1b[1]-s1a[1]
    qx, qy = s2a
    sx, sy = s2b[0]-s2a[0], s2b[1]-s2a[1]

    rxs   = rx*sy - ry*sx
    q_p_x = qx - px
    q_p_y = qy - py
    q_pxr = q_p_x*ry - q_p_y*rx

    if almost_equal_scalar(rxs, 0.0):
        return None  # parallel or collinear

    t = (q_p_x*sy - q_p_y*sx) / rxs
    u = (q_p_x*ry - q_p_y*rx) / rxs

    if -EPS <= t <= 1.0+EPS and -EPS <= u <= 1.0+EPS:
        return (px + t*rx, py + t*ry)
    return None

# ── Affine normalizer ─────────────────────────────────────────────────────────

class AffineNorm:
    """
    Transforms geo coords → normalized SVG pixel space (0-1).
    px_norm = a*geoX + b*geoY + c
    py_norm = d*geoX + e*geoY + f
    """
    def __init__(self, a, b, c, d, e, f):
        self.a, self.b, self.c = a, b, c
        self.d, self.e, self.f = d, e, f

    def normalize(self, x, y):
        px = self.a*x + self.b*y + self.c
        py = self.d*x + self.e*y + self.f
        # Clamp to [0, 1]
        px = max(0.0, min(1.0, px))
        py = max(0.0, min(1.0, py))
        return px, py


def read_affine_from_points_file(points_path, svg_w, svg_h):
    """
    Parse a QGIS .points file and compute affine transform:
    geo coords → normalized SVG pixel (0-1).

    .points format:
        mapX,mapY,sourceX,sourceY,enable[,dX,dY,residual]
    QGIS saves sourceY as negative (flipped Y), so we negate it.
    """
    gcps = []  # list of (geoX, geoY, px_norm, py_norm)

    with open(points_path, "r") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            if "mapX" in line:
                continue  # header row

            parts = line.split(",")
            if len(parts) < 5:
                continue
            try:
                map_x  = float(parts[0])
                map_y  = float(parts[1])
                src_x  = float(parts[2])
                src_y  = float(parts[3])
                enabled = int(float(parts[4]))
            except ValueError:
                continue

            if not enabled:
                continue

            # Normalize pixel coords to 0-1
            # QGIS sourceY is negative → negate to get positive pixel Y
            px_norm = src_x   / svg_w
            py_norm = (-src_y) / svg_h

            gcps.append((map_x, map_y, px_norm, py_norm))

    if len(gcps) < 3:
        print(f"  WARNING: Only {len(gcps)} GCPs in {points_path} (need ≥3)")
        return None

    # Least-squares affine fit
    # Build matrix A (n x 3) and vectors bx, by
    A  = np.array([[g[0], g[1], 1.0] for g in gcps])
    bx = np.array([g[2] for g in gcps])
    by = np.array([g[3] for g in gcps])

    # Solve using least squares
    sol_x, _, _, _ = np.linalg.lstsq(A, bx, rcond=None)
    sol_y, _, _, _ = np.linalg.lstsq(A, by, rcond=None)

    a, b, c = sol_x
    d, e, f  = sol_y

    # Print residuals for debugging
    print(f"  Affine: px = {a:.6f}*X + {b:.6f}*Y + {c:.6f}")
    print(f"  Affine: py = {d:.6f}*X + {e:.6f}*Y + {f:.6f}")

    return AffineNorm(a, b, c, d, e, f)


def read_svg_size(svg_path):
    """Read width and height from SVG file header."""
    try:
        with open(svg_path, "r", encoding="utf-8", errors="ignore") as f:
            content = f.read(3000)  # first 3000 chars is enough

        # Try width/height attributes
        w_match = re.search(r'<svg[^>]*\swidth=["\']([0-9.]+)', content)
        h_match = re.search(r'<svg[^>]*\sheight=["\']([0-9.]+)', content)
        if w_match and h_match:
            return float(w_match.group(1)), float(h_match.group(1))

        # Try viewBox
        vb_match = re.search(r'viewBox=["\']([0-9.\s]+)["\']', content)
        if vb_match:
            parts = vb_match.group(1).strip().split()
            if len(parts) == 4:
                return float(parts[2]), float(parts[3])

    except Exception as e:
        print(f"  WARNING: Could not read SVG size from {svg_path}: {e}")

    print(f"  WARNING: Could not read SVG size, using 1000x1000 fallback")
    return 1000.0, 1000.0

# ── GeoJSON helpers ───────────────────────────────────────────────────────────

def get_floor(properties):
    """Extract floor number from feature properties."""
    if "floor" not in properties or properties["floor"] is None:
        return None
    try:
        val = int(round(float(properties["floor"])))
        # floor 0 in the GeoJSON means basement S2 → map to -2
        if val == 0:
            return -2
        return val
    except (TypeError, ValueError):
        return None


def read_coord(coord):
    """Read [x, y] or [x, y, z] coordinate."""
    return float(coord[0]), float(coord[1])


def polygon_centroid(ring):
    """Compute polygon centroid from a list of (x, y) tuples."""
    n = len(ring)
    if n < 3:
        if n == 0:
            return (0.0, 0.0)
        return (
            sum(p[0] for p in ring) / n,
            sum(p[1] for p in ring) / n
        )

    A  = 0.0
    cx = 0.0
    cy = 0.0
    for i in range(n):
        p0 = ring[i]
        p1 = ring[(i+1) % n]
        cross = p0[0]*p1[1] - p1[0]*p0[1]
        A  += cross
        cx += (p0[0] + p1[0]) * cross
        cy += (p0[1] + p1[1]) * cross

    A *= 0.5
    if abs(A) <= EPS:
        return (
            sum(p[0] for p in ring) / n,
            sum(p[1] for p in ring) / n
        )

    cx /= (6.0 * A)
    cy /= (6.0 * A)
    return (cx, cy)

# ── Graph builder ─────────────────────────────────────────────────────────────

def param_t(sa, sb, p):
    """Parameter t of point p along segment (sa→sb)."""
    dx = sb[0] - sa[0]
    dy = sb[1] - sa[1]
    if abs(dx) >= abs(dy):
        return (p[0] - sa[0]) / dx if abs(dx) > EPS else 0.0
    else:
        return (p[1] - sa[1]) / dy if abs(dy) > EPS else 0.0


def build_graph_from_segments(segments):
    """
    Given a list of (a, b) segments (each a/b is (x, y)),
    split at intersections and return (vertices, edges).
    vertices: list of (x, y)
    edges:    list of [i, j]
    """
    n = len(segments)
    # Collect split points per segment
    split_pts = [list(s) for s in segments]  # each entry: [a, b, ...]

    for i in range(n):
        for j in range(i+1, n):
            ip = segment_intersection(
                segments[i][0], segments[i][1],
                segments[j][0], segments[j][1]
            )
            if ip:
                split_pts[i].append(ip)
                split_pts[j].append(ip)

    # Dedup + sort + build edges
    verts  = []  # list of (x, y)
    vert_map = {}  # for fast lookup
    edge_set = set()

    def add_vert(p):
        # Round to 6 decimal places for dedup
        key = (round(p[0], 6), round(p[1], 6))
        if key in vert_map:
            return vert_map[key]
        idx = len(verts)
        verts.append(p)
        vert_map[key] = idx
        return idx

    for i in range(n):
        pts = split_pts[i]
        sa, sb = segments[i]

        # Dedup
        uniq = []
        for p in pts:
            is_dup = False
            for q in uniq:
                if almost_equal(p, q, 1e-6):
                    is_dup = True
                    break
            if not is_dup:
                uniq.append(p)

        # Sort along segment
        uniq.sort(key=lambda p: param_t(sa, sb, p))

        # Add edges between consecutive points
        for k in range(len(uniq)-1):
            a_idx = add_vert(uniq[k])
            b_idx = add_vert(uniq[k+1])
            if a_idx == b_idx:
                continue
            lo, hi = min(a_idx, b_idx), max(a_idx, b_idx)
            edge_set.add((lo, hi))

    edges = [[lo, hi] for lo, hi in sorted(edge_set)]
    return verts, edges

# ── Floor data parsing ────────────────────────────────────────────────────────

def parse_hallways(hallways_path):
    """
    Parse hallways.geojson → dict of floor_number → list of segments.
    Each segment is ((x1,y1), (x2,y2)).
    """
    floors = {}  # floor_num → list of segments

    with open(hallways_path, "r") as f:
        data = json.load(f)

    for feat in data.get("features", []):
        props = feat.get("properties", {})
        geom  = feat.get("geometry", {})

        floor = get_floor(props)
        if floor is None:
            continue
        if geom.get("type") != "LineString":
            continue

        coords = geom.get("coordinates", [])
        if len(coords) < 2:
            continue

        if floor not in floors:
            floors[floor] = []

        for i in range(len(coords)-1):
            a = read_coord(coords[i])
            b = read_coord(coords[i+1])
            floors[floor].append((a, b))

    return floors


def parse_pois(poi_path, floors_pois):
    """
    Parse POIs.geojson → append POI dicts to floors_pois[floor_num].
    floors_pois: dict floor_num → list of poi dicts
    """
    with open(poi_path, "r") as f:
        data = json.load(f)

    for feat in data.get("features", []):
        props = feat.get("properties", {})
        geom  = feat.get("geometry", {})

        floor = get_floor(props)
        if floor is None:
            continue
        if geom.get("type") != "Point":
            continue

        poi_type = props.get("type") or "poi"
        fid      = props.get("fid", -1)
        name     = f"poi_{fid}"
        pos      = read_coord(geom["coordinates"])

        if floor not in floors_pois:
            floors_pois[floor] = []

        floors_pois[floor].append({
            "type":     poi_type,
            "name":     name,
            "position": pos,
            "polygon":  [],
        })


def parse_rooms(rooms_path, floors_pois):
    """
    Parse rooms.geojson → append room dicts to floors_pois[floor_num].
    """
    with open(rooms_path, "r") as f:
        data = json.load(f)

    for feat in data.get("features", []):
        props = feat.get("properties", {})
        geom  = feat.get("geometry", {})

        floor = get_floor(props)
        if floor is None:
            continue
        if geom.get("type") != "Polygon":
            continue

        rings = geom.get("coordinates", [])
        if not rings or len(rings[0]) < 3:
            continue

        outer = [read_coord(c) for c in rings[0]]

        # Name
        name = props.get("name", "")
        if not name:
            room_nbr = props.get("roomNbr")
            if room_nbr is not None:
                name = f"Room {room_nbr}"
            else:
                name = "room"

        centroid = polygon_centroid(outer)

        if floor not in floors_pois:
            floors_pois[floor] = []

        floors_pois[floor].append({
            "type":     "room",
            "name":     name,
            "position": centroid,
            "polygon":  outer,
        })

# ── Main builder ──────────────────────────────────────────────────────────────

def build_building(building_code, building_dir):
    """
    Process one building directory and return the JSON object for it.
    """
    building_dir = Path(building_dir)
    print(f"\nBuilding: {building_code}")

    # 1) Parse hallways (required)
    hallways_path = building_dir / "hallways.geojson"
    floor_segments = parse_hallways(hallways_path)

    # 2) Parse POIs (optional)
    floors_pois = {}
    poi_path = building_dir / "POIs.geojson"
    if poi_path.exists():
        parse_pois(poi_path, floors_pois)

    # 3) Parse rooms (optional)
    rooms_path = building_dir / "rooms.geojson"
    if rooms_path.exists():
        parse_rooms(rooms_path, floors_pois)

    # 4) All floor numbers
    all_floors = sorted(set(floor_segments.keys()) | set(floors_pois.keys()))

    floors_out = []

    for floor_num in all_floors:
        print(f"\n  Floor {floor_num}")

        # 5) Find .points file and SVG
        # Naming convention: VL_1.points, VL_1.svg
        # Handles both floor 1 and floor -2 (basement = S2 in data)
        FLOOR_NUM_TO_STR = {
            -2: "S2",
            -1: "S1",
            # add more basement floors here if needed
        }

        floor_str = FLOOR_NUM_TO_STR.get(floor_num, str(floor_num))

        points_file = building_dir / f"{building_code}_{floor_str}.points"
        svg_file    = building_dir / "floormaps" / \
                      f"{building_code}_{floor_str}.svg"

        # 6) Get SVG size
        if svg_file.exists():
            svg_w, svg_h = read_svg_size(svg_file)
            img_path = f"floormaps/{building_code}_{floor_str}.svg"
        else:
            print(f"  WARNING: SVG not found: {svg_file}, using 1000x1000")
            svg_w, svg_h = 1000.0, 1000.0
            img_path = ""

        # 7) Build affine normalizer from .points file
        norm = None
        if points_file.exists():
            print(f"  Using points: {points_file}")
            norm = read_affine_from_points_file(points_file, svg_w, svg_h)
        else:
            print(f"  WARNING: No .points file found: {points_file}")

        if norm is None:
            print(f"  Skipping floor {floor_num} (no valid normalizer)")
            continue

        # 8) Normalize + build graph from hallway segments
        raw_segs = floor_segments.get(floor_num, [])
        norm_segs = [
            (norm.normalize(*a), norm.normalize(*b))
            for a, b in raw_segs
        ]

        verts, edges = build_graph_from_segments(norm_segs) \
            if norm_segs else ([], [])

        print(f"  Graph: {len(verts)} vertices, {len(edges)} edges")

        # 9) Normalize POIs
        pois_raw = floors_pois.get(floor_num, [])
        pois_out = []
        for poi in pois_raw:
            px, py = norm.normalize(*poi["position"])
            poly_out = [
                {"x": norm.normalize(*p)[0], "y": norm.normalize(*p)[1]}
                for p in poi["polygon"]
            ]
            pois_out.append({
                "name":     poi["name"],
                "type":     poi["type"],
                "position": {"x": px, "y": py},
                "polygon":  poly_out,
            })

        # 10) Build floor object
        floor_obj = {
            "number":   floor_num,
            "name":     f"{building_code}Floor{floor_str}",
            "imgPath":  img_path,
            "vertices": [{"x": v[0], "y": v[1]} for v in verts],
            "edges":    edges,
            "poi":      pois_out,
        }
        floors_out.append(floor_obj)

    return {building_code: floors_out}


def main():
    if not DATA_DIR.exists() or not DATA_DIR.is_dir():
        print(f"ERROR: {DATA_DIR} does not exist or is not a directory")
        sys.exit(1)

    result = []

    for entry in sorted(DATA_DIR.iterdir()):
        if not entry.is_dir():
            continue

        building_code = entry.name
        hallways_path = entry / "hallways.geojson"

        if not hallways_path.exists():
            print(f"Skipping {building_code} (no hallways.geojson)")
            continue

        building_obj = build_building(building_code, entry)
        result.append(building_obj)

    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(result, f, indent=2)

    print(f"\nDone! Output saved to: {OUTPUT_PATH}")


if __name__ == "__main__":
    main()