package repository

import (
	"encoding/json"
	"fmt"
	"os"
	"strings"
	"sync"

	"github.com/works-on-my-machine-390/concordia-waze/internal/domain"
)

type rawCoord struct {
	X float64 `json:"x"`
	Y float64 `json:"y"`
}

type rawPOI struct {
	Type     string     `json:"type"`
	Name     string     `json:"name"`
	Position rawCoord   `json:"position"`
	Polygon  []rawCoord `json:"polygon"`
}

type rawFloor struct {
	Number   int        `json:"number"`
	Name     string     `json:"name"`
	ImgPath  string     `json:"imgPath"`
	Vertices []rawCoord `json:"vertices"`
	Edges    [][]int    `json:"edges"`
	POI      []rawPOI   `json:"poi"`
}
type FloorRepository struct {
	path string

	once    sync.Once
	loadErr error
	byCode  map[string][]domain.Floor
}

func NewFloorRepository(path string) *FloorRepository {
	return &FloorRepository{
		path: path,
	}
}
func (r *FloorRepository) ensureLoaded() error {
	r.once.Do(func() {
		bytes, err := os.ReadFile(r.path)
		if err != nil {
			r.loadErr = fmt.Errorf("read file: %w", err)
			return
		}

		// 1. Unmarshal into the raw shape
		var rawData []map[string][]rawFloor
		if err := json.Unmarshal(bytes, &rawData); err != nil {
			r.loadErr = fmt.Errorf("parse json: %w", err)
			return
		}

		// 2. Map raw data to domain objects
		r.byCode = r.mapToDomain(rawData)
	})
	return r.loadErr
}

// mapToDomain flattens the weird array-of-maps structure and converts types
func (r *FloorRepository) mapToDomain(rawData []map[string][]rawFloor) map[string][]domain.Floor {
	result := make(map[string][]domain.Floor)

	for _, entry := range rawData {
		for buildingCode, floors := range entry {
			key := strings.ToUpper(strings.TrimSpace(buildingCode))

			for _, rf := range floors {
				result[key] = append(result[key], convertToDomain(rf))
			}
		}
	}
	return result
}

// convertToDomain handles the heavy lifting of translating a single floor
func convertToDomain(rf rawFloor) domain.Floor {
	f := domain.Floor{
		FloorName:   rf.Name,
		FloorNumber: rf.Number,
		ImgPath:     rf.ImgPath,
		Vertices:    mapCoords(rf.Vertices),
		Edges:       make([]domain.Edge, 0, len(rf.Edges)),
		POIs:        make([]domain.PointOfInterest, 0, len(rf.POI)),
	}

	for _, e := range rf.Edges {
		if len(e) >= 2 {
			f.Edges = append(f.Edges, domain.Edge{StartVertex: e[0], EndVertex: e[1]})
		}
	}

	for _, rp := range rf.POI {
		f.POIs = append(f.POIs, domain.PointOfInterest{
			Name:     rp.Name,
			Type:     rp.Type,
			Position: domain.Coordinates{X: rp.Position.X, Y: rp.Position.Y},
			Polygon:  mapCoords(rp.Polygon),
		})
	}
	return f
}

// Helper to avoid repeating coordinate mapping logic
func mapCoords(raw []rawCoord) []domain.Coordinates {
	coords := make([]domain.Coordinates, len(raw))
	for i, c := range raw {
		coords[i] = domain.Coordinates{X: c.X, Y: c.Y}
	}
	return coords
}

func (r *FloorRepository) GetBuildingFloors(code string) ([]domain.Floor, error) {
	if err := r.ensureLoaded(); err != nil {
		return nil, err
	}

	cKey := strings.ToUpper(strings.TrimSpace(code))
	floorsMap, ok := r.byCode[cKey]
	if !ok {
		return nil, domain.ErrNotFound
	}
	return floorsMap, nil
}
