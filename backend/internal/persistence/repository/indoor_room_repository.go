package repository

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strconv"
	"strings"

	"github.com/works-on-my-machine-390/concordia-waze/internal/domain"
)

type IndoorRoomGetter interface {
	GetByBuilding(buildingCode string) ([]domain.IndoorRoom, error)
}

type indoorRoomRepository struct {
	baseDir string
	cache   map[string][]domain.IndoorRoom
}

func NewIndoorRoomRepository(baseDir string) IndoorRoomGetter {
	return &indoorRoomRepository{
		baseDir: baseDir,
		cache:   make(map[string][]domain.IndoorRoom),
	}
}

type roomsGeoJSONFeatureCollection struct {
	Type     string                `json:"type"`
	Features []roomsGeoJSONFeature `json:"features"`
}

type roomsGeoJSONFeature struct {
	Type       string         `json:"type"`
	Properties map[string]any `json:"properties"`
	Geometry   roomsGeometry  `json:"geometry"`
}

type roomsGeometry struct {
	Type        string          `json:"type"`
	Coordinates json.RawMessage `json:"coordinates"`
}

func (r *indoorRoomRepository) GetByBuilding(buildingCode string) ([]domain.IndoorRoom, error) {
	b := strings.ToUpper(strings.TrimSpace(buildingCode))
	if b == "" {
		return nil, fmt.Errorf("building cannot be empty")
	}

	if cached, ok := r.cache[b]; ok {
		return cached, nil
	}

	path := filepath.Join(r.baseDir, b, "rooms.geojson")
	raw, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("read %s: %w", path, err)
	}

	var fc roomsGeoJSONFeatureCollection
	if err := json.Unmarshal(raw, &fc); err != nil {
		return nil, fmt.Errorf("parse rooms.geojson: %w", err)
	}

	out := make([]domain.IndoorRoom, 0, len(fc.Features))
	for _, f := range fc.Features {
		room := extractRoomLabel(f.Properties, b)
		floor, _ := asInt(f.Properties["floor"])

		centroid, geomType := centroidFromGeometry(f.Geometry.Type, f.Geometry.Coordinates)
		out = append(out, domain.IndoorRoom{
			Room:         room,
			Building:     b,
			Floor:        floor,
			Centroid:     centroid,
			GeometryType: geomType,
		})
	}

	r.cache[b] = out
	return out, nil
}

func extractRoomLabel(props map[string]any, buildingCode string) string {
	if s := stringProp(props, "name"); s != "" {
		return s
	}
	if s := roomNbrLabel(props, buildingCode); s != "" {
		return s
	}
	for _, k := range []string{"room", "room_number", "number", "label", "id"} {
		if s := stringProp(props, k); s != "" {
			return s
		}
	}
	return ""
}

func stringProp(props map[string]any, key string) string {
	v, ok := props[key]
	if !ok {
		return ""
	}
	s, ok := v.(string)
	if !ok {
		return ""
	}
	return strings.TrimSpace(s)
}

func roomNbrLabel(props map[string]any, buildingCode string) string {
	v, ok := props["roomNbr"]
	if !ok {
		return ""
	}
	n, ok := asInt(v)
	if !ok || n <= 0 {
		return ""
	}
	if buildingCode != "" {
		return buildingCode + "-" + strconv.Itoa(n)
	}
	return strconv.Itoa(n)
}

func centroidFromGeometry(geomType string, coords json.RawMessage) (domain.IndoorPosition, string) {
	switch geomType {
	case "Point":
		var xy [2]float64
		if json.Unmarshal(coords, &xy) == nil {
			return domain.IndoorPosition{X: xy[0], Y: xy[1]}, "Point"
		}
	case "Polygon":
		// [[[x,y],...]] (outer ring is [0])
		var poly [][][]float64
		if json.Unmarshal(coords, &poly) == nil && len(poly) > 0 && len(poly[0]) > 0 {
			return centroidOfRing(poly[0]), "Polygon"
		}
	case "MultiPolygon":
		// [[[[x,y],...]]]
		var mp [][][][]float64
		if json.Unmarshal(coords, &mp) == nil && len(mp) > 0 && len(mp[0]) > 0 && len(mp[0][0]) > 0 {
			return centroidOfRing(mp[0][0]), "MultiPolygon"
		}
	}

	return domain.IndoorPosition{X: 0, Y: 0}, geomType
}

// centroid of a polygon ring (simple planar centroid / shoelace).
// If area is 0 (degenerate), falls back to average of points.
func centroidOfRing(ring [][]float64) domain.IndoorPosition {
	if len(ring) < 3 {
		return avgPoints(ring)
	}

	// Ensure closed ring for centroid calc
	points := ring
	if ring[0][0] != ring[len(ring)-1][0] || ring[0][1] != ring[len(ring)-1][1] {
		points = append(points, ring[0])
	}

	var a, cx, cy float64
	for i := 0; i < len(points)-1; i++ {
		x0, y0 := points[i][0], points[i][1]
		x1, y1 := points[i+1][0], points[i+1][1]
		cross := x0*y1 - x1*y0
		a += cross
		cx += (x0 + x1) * cross
		cy += (y0 + y1) * cross
	}

	if a == 0 {
		return avgPoints(points)
	}

	a *= 0.5
	cx /= (6 * a)
	cy /= (6 * a)
	return domain.IndoorPosition{X: cx, Y: cy}
}

func avgPoints(points [][]float64) domain.IndoorPosition {
	if len(points) == 0 {
		return domain.IndoorPosition{X: 0, Y: 0}
	}
	var sx, sy float64
	for _, p := range points {
		if len(p) >= 2 {
			sx += p[0]
			sy += p[1]
		}
	}
	return domain.IndoorPosition{X: sx / float64(len(points)), Y: sy / float64(len(points))}
}
