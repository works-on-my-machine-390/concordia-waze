package repository

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/works-on-my-machine-390/concordia-waze/internal/domain"
)

type IndoorPOIRepository interface {
	GetByBuilding(buildingCode string) ([]domain.IndoorPOI, error)
}

type indoorPOIRepository struct {
	baseDir string
	cache   map[string][]domain.IndoorPOI
}

func NewIndoorPOIRepository(baseDir string) IndoorPOIRepository {
	return &indoorPOIRepository{
		baseDir: baseDir,
		cache:   make(map[string][]domain.IndoorPOI),
	}
}

type geoJSONFeatureCollection struct {
	Type     string           `json:"type"`
	Features []geoJSONFeature `json:"features"`
}

type geoJSONFeature struct {
	Type       string               `json:"type"`
	Properties map[string]any       `json:"properties"`
	Geometry   geoJSONPointGeometry `json:"geometry"`
}

type geoJSONPointGeometry struct {
	Type        string     `json:"type"`
	Coordinates [2]float64 `json:"coordinates"` // [x,y]
}

func (r *indoorPOIRepository) GetByBuilding(buildingCode string) ([]domain.IndoorPOI, error) {
	b := strings.ToUpper(strings.TrimSpace(buildingCode))
	if b == "" {
		return nil, fmt.Errorf("building cannot be empty")
	}

	if cached, ok := r.cache[b]; ok {
		return cached, nil
	}

	path := filepath.Join(r.baseDir, b, "POIs.geojson")
	raw, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("read %s: %w", path, err)
	}

	var fc geoJSONFeatureCollection
	if err := json.Unmarshal(raw, &fc); err != nil {
		return nil, fmt.Errorf("parse POIs.geojson: %w", err)
	}

	out := make([]domain.IndoorPOI, 0, len(fc.Features))
	for _, f := range fc.Features {
		fid, _ := asInt(f.Properties["fid"])
		floor, _ := asInt(f.Properties["floor"])
		poiType, _ := f.Properties["type"].(string)

		x := f.Geometry.Coordinates[0]
		y := f.Geometry.Coordinates[1]

		out = append(out, domain.IndoorPOI{
			ID:       fid,
			Building: b,
			Floor:    floor,
			Type:     poiType,
			Position: domain.IndoorPosition{X: x, Y: y},
		})
	}

	r.cache[b] = out
	return out, nil
}

func asInt(v any) (int, bool) {
	switch t := v.(type) {
	case float64:
		return int(t), true
	case int:
		return t, true
	default:
		return 0, false
	}
}
