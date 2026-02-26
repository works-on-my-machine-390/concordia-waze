#include <algorithm>
#include <array>
#include <cmath>
#include <cstddef>
#include <filesystem>
#include <fstream>
#include <iostream>
#include <limits>
#include <map>
#include <optional>
#include <set>
#include <sstream>
#include <string>
#include <unordered_map>
#include <utility>
#include <variant>
#include <vector>

// nlohmann/json single-header library:
// Install: apt/yum/vcpkg or drop json.hpp next to this file.
// https://github.com/nlohmann/json
#include <nlohmann/json.hpp>

namespace fs = std::filesystem;
using json = nlohmann::json;

static constexpr double EPS = 1e-7;

struct Vec2 {
  double x = 0;
  double y = 0;
};

static bool almostEqual(double a, double b, double eps = EPS) {
  return std::abs(a - b) <= eps;
}

static bool almostEqual(const Vec2 &a, const Vec2 &b, double eps = EPS) {
  return almostEqual(a.x, b.x, eps) && almostEqual(a.y, b.y, eps);
}

static double cross(const Vec2 &a, const Vec2 &b, const Vec2 &c) {
  // (b-a) x (c-a)
  return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
}

static double dot(const Vec2 &a, const Vec2 &b, const Vec2 &c) {
  // (b-a) . (c-a)
  return (b.x - a.x) * (c.x - a.x) + (b.y - a.y) * (c.y - a.y);
}

static double dist2(const Vec2 &a, const Vec2 &b) {
  double dx = a.x - b.x;
  double dy = a.y - b.y;
  return dx * dx + dy * dy;
}

struct Segment {
  Vec2 a, b;
};

// Returns intersection point if segments intersect properly or at endpoints.
// Collinear overlaps are handled by returning std::nullopt (but endpoints are
// still caught).
static std::optional<Vec2> segmentIntersectionPoint(const Segment &s1,
                                                    const Segment &s2) {
  Vec2 p = s1.a;
  Vec2 r{s1.b.x - s1.a.x, s1.b.y - s1.a.y};
  Vec2 q = s2.a;
  Vec2 s{s2.b.x - s2.a.x, s2.b.y - s2.a.y};

  double rxs = r.x * s.y - r.y * s.x;
  double q_pxr = (q.x - p.x) * r.y - (q.y - p.y) * r.x;

  if (almostEqual(rxs, 0.0) && almostEqual(q_pxr, 0.0)) {
    // Collinear - overlapping segments: we skip generating infinite
    // intersections. Endpoints will be handled elsewhere by vertex
    // deduplication.
    return std::nullopt;
  }
  if (almostEqual(rxs, 0.0) && !almostEqual(q_pxr, 0.0)) {
    // Parallel non-intersecting
    return std::nullopt;
  }

  double t = ((q.x - p.x) * s.y - (q.y - p.y) * s.x) / rxs;
  double u = ((q.x - p.x) * r.y - (q.y - p.y) * r.x) / rxs;

  if (t < -EPS || t > 1.0 + EPS || u < -EPS || u > 1.0 + EPS)
    return std::nullopt;

  Vec2 inter{p.x + t * r.x, p.y + t * r.y};
  return inter;
}

struct Normalizer {
  double minX = 0, minY = 0;
  double maxX = 1, maxY = 1;

  Vec2 normalize(const Vec2 &p) const {
    double dx = maxX - minX;
    double dy = maxY - minY;
    Vec2 out;
    out.x = (dx <= EPS) ? 0.0 : (p.x - minX) / dx;
    out.y = (dy <= EPS) ? 0.0 : (p.y - minY) / dy;
    // Clamp to [0,1] (optional but often helpful)
    out.x = std::max(0.0, std::min(1.0, out.x));
    out.y = std::max(0.0, std::min(1.0, out.y));
    return out;
  }
};

static std::optional<Normalizer>
readFloorCornersNormalizer(const fs::path &txtPath) {
  std::ifstream in(txtPath);
  if (!in)
    return std::nullopt;

  double minX = std::numeric_limits<double>::infinity();
  double minY = std::numeric_limits<double>::infinity();
  double maxX = -std::numeric_limits<double>::infinity();
  double maxY = -std::numeric_limits<double>::infinity();

  std::string line;
  while (std::getline(in, line)) {
    if (line.empty())
      continue;
    // Format: x,y,  (trailing comma)
    // We'll split by comma.
    std::vector<std::string> parts;
    std::stringstream ss(line);
    std::string item;
    while (std::getline(ss, item, ',')) {
      if (!item.empty())
        parts.push_back(item);
    }
    if (parts.size() < 2)
      continue;
    double x = std::stod(parts[0]);
    double y = std::stod(parts[1]);

    minX = std::min(minX, x);
    minY = std::min(minY, y);
    maxX = std::max(maxX, x);
    maxY = std::max(maxY, y);
  }

  if (!std::isfinite(minX) || !std::isfinite(minY) || !std::isfinite(maxX) ||
      !std::isfinite(maxY))
    return std::nullopt;

  Normalizer n;
  n.minX = minX;
  n.minY = minY;
  n.maxX = maxX;
  n.maxY = maxY;
  return n;
}

static json loadJsonFile(const fs::path &p) {
  std::ifstream in(p);
  if (!in)
    throw std::runtime_error("Failed to open " + p.string());
  json j;
  in >> j;
  return j;
}

static std::optional<int> getFloor(const json &props) {
  if (!props.contains("floor") || props["floor"].is_null())
    return std::nullopt;
  if (props["floor"].is_number_integer())
    return props["floor"].get<int>();
  if (props["floor"].is_number_float())
    return static_cast<int>(std::lround(props["floor"].get<double>()));
  return std::nullopt;
}

static Vec2 readCoord2(const json &coord) {
  // coord: [x,y] possibly [x,y,z]
  Vec2 p;
  p.x = coord.at(0).get<double>();
  p.y = coord.at(1).get<double>();
  return p;
}

static Vec2 polygonCentroid(const std::vector<Vec2> &ring) {
  // Basic centroid of polygon ring (expects closed or non-closed; we handle
  // both). If degenerate, fallback to average.
  double A = 0.0;
  double Cx = 0.0, Cy = 0.0;

  size_t n = ring.size();
  if (n < 3) {
    Vec2 avg{0, 0};
    for (auto &p : ring) {
      avg.x += p.x;
      avg.y += p.y;
    }
    if (n > 0) {
      avg.x /= n;
      avg.y /= n;
    }
    return avg;
  }

  for (size_t i = 0; i < n; i++) {
    const Vec2 &p0 = ring[i];
    const Vec2 &p1 = ring[(i + 1) % n];
    double crossp = p0.x * p1.y - p1.x * p0.y;
    A += crossp;
    Cx += (p0.x + p1.x) * crossp;
    Cy += (p0.y + p1.y) * crossp;
  }
  A *= 0.5;
  if (std::abs(A) <= EPS) {
    Vec2 avg{0, 0};
    for (auto &p : ring) {
      avg.x += p.x;
      avg.y += p.y;
    }
    avg.x /= n;
    avg.y /= n;
    return avg;
  }
  Cx /= (6.0 * A);
  Cy /= (6.0 * A);
  return Vec2{Cx, Cy};
}

struct POIOut {
  std::string type;
  std::string name;
  Vec2 position;
  std::vector<Vec2> polygon; // empty for point POIs
};

struct FloorData {
  int floor = 0;
  std::vector<Segment> rawSegments; // from LineStrings
  std::vector<POIOut> pois;         // from POIs + rooms
};

struct GraphOut {
  std::vector<Vec2> vertices;
  std::vector<std::array<int, 2>> edges;
};

struct VertexIndex {
  // Simple O(n) dedup with epsilon; fine for moderate sizes.
  std::vector<Vec2> verts;

  int add(const Vec2 &p) {
    for (int i = 0; i < (int)verts.size(); i++) {
      if (almostEqual(verts[i], p, 1e-6))
        return i;
    }
    verts.push_back(p);
    return (int)verts.size() - 1;
  }
};

static GraphOut buildGraphFromSegments(const std::vector<Segment> &segs) {
  // Collect split points for each segment (endpoints + intersections)
  std::vector<std::vector<Vec2>> splitPoints(segs.size());
  for (size_t i = 0; i < segs.size(); i++) {
    splitPoints[i].push_back(segs[i].a);
    splitPoints[i].push_back(segs[i].b);
  }

  for (size_t i = 0; i < segs.size(); i++) {
    for (size_t j = i + 1; j < segs.size(); j++) {
      auto ip = segmentIntersectionPoint(segs[i], segs[j]);
      if (!ip)
        continue;
      splitPoints[i].push_back(*ip);
      splitPoints[j].push_back(*ip);
    }
  }

  VertexIndex vIndex;
  std::set<std::pair<int, int>> edgeSet;

  auto paramT = [](const Segment &s, const Vec2 &p) {
    // parameter along segment using whichever axis is larger to reduce
    // precision issues
    double dx = s.b.x - s.a.x;
    double dy = s.b.y - s.a.y;
    if (std::abs(dx) >= std::abs(dy)) {
      if (std::abs(dx) <= EPS)
        return 0.0;
      return (p.x - s.a.x) / dx;
    } else {
      if (std::abs(dy) <= EPS)
        return 0.0;
      return (p.y - s.a.y) / dy;
    }
  };

  for (size_t i = 0; i < segs.size(); i++) {
    auto pts = splitPoints[i];

    // dedup points on this segment
    std::vector<Vec2> uniq;
    for (auto &p : pts) {
      bool found = false;
      for (auto &q : uniq) {
        if (almostEqual(p, q, 1e-6)) {
          found = true;
          break;
        }
      }
      if (!found)
        uniq.push_back(p);
    }

    // sort along segment
    std::sort(uniq.begin(), uniq.end(), [&](const Vec2 &p1, const Vec2 &p2) {
      return paramT(segs[i], p1) < paramT(segs[i], p2);
    });

    // create edges between consecutive points
    for (size_t k = 0; k + 1 < uniq.size(); k++) {
      int a = vIndex.add(uniq[k]);
      int b = vIndex.add(uniq[k + 1]);
      if (a == b)
        continue;
      int lo = std::min(a, b), hi = std::max(a, b);
      edgeSet.insert({lo, hi});
    }
  }

  GraphOut out;
  out.vertices = std::move(vIndex.verts);
  for (auto &e : edgeSet) {
    out.edges.push_back({e.first, e.second});
  }
  return out;
}

static std::map<int, FloorData>
parseHallwaysByFloor(const fs::path &hallwaysPath) {
  std::map<int, FloorData> floors;
  json j = loadJsonFile(hallwaysPath);
  if (!j.contains("features"))
    return floors;

  for (const auto &feat : j["features"]) {
    if (!feat.contains("properties") || !feat.contains("geometry"))
      continue;
    auto fl = getFloor(feat["properties"]);
    if (!fl)
      continue;

    const auto &geom = feat["geometry"];
    if (!geom.contains("type") || geom["type"] != "LineString")
      continue;
    const auto &coords = geom["coordinates"];
    if (!coords.is_array() || coords.size() < 2)
      continue;

    FloorData &fd = floors[*fl];
    fd.floor = *fl;

    for (size_t i = 0; i + 1 < coords.size(); i++) {
      Vec2 a = readCoord2(coords[i]);
      Vec2 b = readCoord2(coords[i + 1]);
      fd.rawSegments.push_back(Segment{a, b});
    }
  }
  return floors;
}

static void parsePOIsIntoFloors(const fs::path &poiPath,
                                std::map<int, FloorData> &floors) {
  json j = loadJsonFile(poiPath);
  if (!j.contains("features"))
    return;

  for (const auto &feat : j["features"]) {
    if (!feat.contains("properties") || !feat.contains("geometry"))
      continue;
    auto fl = getFloor(feat["properties"]);
    if (!fl)
      continue;

    const auto &geom = feat["geometry"];
    if (!geom.contains("type") || geom["type"] != "Point")
      continue;

    POIOut out;
    out.type = feat["properties"].value("type", "poi");
    // Some of your POIs have null type; handle that
    if (feat["properties"].contains("type") &&
        feat["properties"]["type"].is_null())
      out.type = "poi";

    int fid = feat["properties"].value("fid", -1);
    out.name = "poi_" + std::to_string(fid);

    out.position = readCoord2(geom["coordinates"]);

    FloorData &fd = floors[*fl];
    fd.floor = *fl;
    fd.pois.push_back(std::move(out));
  }
}

static void parseRoomsIntoFloors(const fs::path &roomsPath,
                                 std::map<int, FloorData> &floors) {
  json j = loadJsonFile(roomsPath);
  if (!j.contains("features"))
    return;

  for (const auto &feat : j["features"]) {
    if (!feat.contains("properties") || !feat.contains("geometry"))
      continue;
    auto fl = getFloor(feat["properties"]);
    if (!fl)
      continue;

    const auto &geom = feat["geometry"];
    if (!geom.contains("type") || geom["type"] != "Polygon")
      continue;

    // Polygon coordinates: [ [ [x,y], [x,y], ... ] ] (outer ring first)
    const auto &rings = geom["coordinates"];
    if (!rings.is_array() || rings.empty())
      continue;

    const auto &outer = rings.at(0);
    if (!outer.is_array() || outer.size() < 3)
      continue;

    POIOut out;
    out.type = "room";

    std::string name = feat["properties"].value("name", "");
    if (name.empty()) {
      if (feat["properties"].contains("roomNbr")) {
        if (feat["properties"]["roomNbr"].is_number())
          name = "Room " +
                 std::to_string(feat["properties"]["roomNbr"].get<int>());
      }
      if (name.empty())
        name = "room";
    }
    out.name = name;

    out.polygon.reserve(outer.size());
    for (const auto &c : outer)
      out.polygon.push_back(readCoord2(c));

    out.position = polygonCentroid(out.polygon);

    FloorData &fd = floors[*fl];
    fd.floor = *fl;
    fd.pois.push_back(std::move(out));
  }
}

static json vecToJson(const Vec2 &p) { return json{{"x", p.x}, {"y", p.y}}; }

static json buildOutputForBuilding(const std::string &buildingCode,
                                   const fs::path &buildingDir) {
  // Parse hallways first to discover floors
  auto floors = parseHallwaysByFloor(buildingDir / "hallways.geojson");

  // Add POIs & rooms
  fs::path poiPath = buildingDir / "POIs.geojson";
  if (fs::exists(poiPath))
    parsePOIsIntoFloors(poiPath, floors);

  fs::path roomsPath = buildingDir / "rooms.geojson";
  if (fs::exists(roomsPath))
    parseRoomsIntoFloors(roomsPath, floors);

  // Build output floors array
  json floorsArr = json::array();

  for (auto &[floorNum, fd] : floors) {
    // Read normalizer per floor from <code>-<floor>.txt
    fs::path cornersPath =
        buildingDir / (buildingCode + "-" + std::to_string(floorNum) + ".txt");
    auto normOpt = readFloorCornersNormalizer(cornersPath);
    if (!normOpt) {
      std::cerr << "Warning: missing/invalid corners file for " << buildingCode
                << " floor " << floorNum << ": " << cornersPath << "\n";
      // Fallback: compute from hallway endpoints + poi points (less accurate
      // but prevents crash)
      Normalizer fallback;
      fallback.minX = fallback.minY = std::numeric_limits<double>::infinity();
      fallback.maxX = fallback.maxY = -std::numeric_limits<double>::infinity();

      auto take = [&](const Vec2 &p) {
        fallback.minX = std::min(fallback.minX, p.x);
        fallback.minY = std::min(fallback.minY, p.y);
        fallback.maxX = std::max(fallback.maxX, p.x);
        fallback.maxY = std::max(fallback.maxY, p.y);
      };
      for (auto &s : fd.rawSegments) {
        take(s.a);
        take(s.b);
      }
      for (auto &poi : fd.pois) {
        take(poi.position);
        for (auto &pp : poi.polygon)
          take(pp);
      }
      if (std::isfinite(fallback.minX))
        normOpt = fallback;
    }
    if (!normOpt)
      continue;
    Normalizer norm = *normOpt;

    // Normalize segments
    std::vector<Segment> normSegs;
    normSegs.reserve(fd.rawSegments.size());
    for (auto &s : fd.rawSegments) {
      normSegs.push_back(Segment{norm.normalize(s.a), norm.normalize(s.b)});
    }

    // Build graph
    GraphOut graph = buildGraphFromSegments(normSegs);

    // Normalize POIs
    json poiArr = json::array();
    for (auto &poi : fd.pois) {
      json poiJ;
      poiJ["type"] = poi.type;
      poiJ["name"] = poi.name;

      Vec2 posN = norm.normalize(poi.position);
      poiJ["position"] = vecToJson(posN);

      json polyArr = json::array();
      for (auto &p : poi.polygon) {
        polyArr.push_back(vecToJson(norm.normalize(p)));
      }
      poiJ["polygon"] = polyArr;

      poiArr.push_back(std::move(poiJ));
    }

    // vertices / edges
    json vertsArr = json::array();
    for (auto &v : graph.vertices)
      vertsArr.push_back(vecToJson(v));

    json edgesArr = json::array();
    for (auto &e : graph.edges)
      edgesArr.push_back(json::array({e[0], e[1]}));

    json floorJ;
    floorJ["number"] = floorNum;
    floorJ["name"] = buildingCode + "Floor" + std::to_string(floorNum);
    floorJ["imgPath"] = ""; // fill if you have an image per floor
    floorJ["vertices"] = std::move(vertsArr);
    floorJ["edges"] = std::move(edgesArr);
    floorJ["poi"] = std::move(poiArr);

    floorsArr.push_back(std::move(floorJ));
  }

  // Your desired wrapper: [ { "BuildingCode": [ floors... ] }, ... ]
  json buildingObj;
  buildingObj[buildingCode] = std::move(floorsArr);
  return buildingObj;
}

int main(int argc, char **argv) {
  try {
    if (argc < 3) {
      std::cerr << "Usage:\n"
                << "  " << argv[0] << " <rootDataDir> <output.json>\n\n"
                << "rootDataDir should contain subfolders like CC/, LB/, VL/ "
                   "each with:\n"
                << "  hallways.geojson\n"
                << "  POIs.geojson (optional)\n"
                << "  rooms.geojson (optional)\n"
                << "  <CODE>-<FLOOR>.txt (e.g. LB-2.txt)\n";
      return 2;
    }

    fs::path root = argv[1];
    fs::path outPath = argv[2];

    if (!fs::exists(root) || !fs::is_directory(root))
      throw std::runtime_error(
          "Root data dir does not exist or is not a directory: " +
          root.string());

    json out = json::array();

    for (auto &entry : fs::directory_iterator(root)) {
      if (!entry.is_directory())
        continue;
      std::string buildingCode = entry.path().filename().string();

      // Only process directories that look like building codes; remove this
      // filter if you want.
      if (buildingCode.empty())
        continue;

      fs::path buildingDir = entry.path();
      fs::path hallwaysPath = buildingDir / "hallways.geojson";
      if (!fs::exists(hallwaysPath)) {
        std::cerr << "Skipping " << buildingCode << " (no hallways.geojson)\n";
        continue;
      }

      std::cerr << "Processing building " << buildingCode << "...\n";
      out.push_back(buildOutputForBuilding(buildingCode, buildingDir));
    }

    std::ofstream outFile(outPath);
    outFile << out.dump(2) << "\n";
    std::cerr << "Wrote " << outPath << "\n";
    return 0;

  } catch (const std::exception &ex) {
    std::cerr << "Error: " << ex.what() << "\n";
    return 1;
  }
}
