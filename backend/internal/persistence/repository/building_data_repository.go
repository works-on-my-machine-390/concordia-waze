package repository

import (
	"encoding/json"
	"fmt"
	"os"
	"strings"
	"sync"

	"github.com/works-on-my-machine-390/concordia-waze/internal/domain"
)

type BuildingDataRepository struct {
	path string

	once     sync.Once
	loadErr  error
	byCampus map[string][]rawBuilding
	byCode   map[string]rawBuilding
}

type rawShape struct {
	Type        string        `json:"type"`
	Coordinates [][][]float64 `json:"coordinates"`
}

type rawBuilding struct {
	Code      string    `json:"code"`
	Name      string    `json:"name"`
	LongName  string    `json:"long_name"`
	Address   string    `json:"address"`
	Latitude  float64   `json:"latitude"`
	Longitude float64   `json:"longitude"`
	Shape     *rawShape `json:"shape"`
}

func NewBuildingDataRepository(path string) *BuildingDataRepository {
	return &BuildingDataRepository{
		path: path,
	}
}

func (r *BuildingDataRepository) ensureLoaded() error {
	r.once.Do(func() {
		bytes, err := os.ReadFile(r.path)
		if err != nil {
			r.loadErr = fmt.Errorf("read json: %w", err)
			return
		}

		var parsed map[string][]rawBuilding
		if err := json.Unmarshal(bytes, &parsed); err != nil {
			r.loadErr = fmt.Errorf("parse json: %w", err)
			return
		}

		r.byCampus = make(map[string][]rawBuilding)
		r.byCode = make(map[string]rawBuilding)

		for campus, buildings := range parsed {
			cKey := strings.ToUpper(strings.TrimSpace(campus))
			r.byCampus[cKey] = buildings

			for _, b := range buildings {
				r.byCode[strings.ToUpper(strings.TrimSpace(b.Code))] = b
			}
		}
	})

	return r.loadErr
}

func (r *BuildingDataRepository) GetBuilding(code string) (*domain.Building, error) {
	if err := r.ensureLoaded(); err != nil {
		return nil, err
	}

	key := strings.ToUpper(strings.TrimSpace(code))
	b, ok := r.byCode[key]
	if !ok {
		return nil, domain.ErrNotFound
	}

	return &domain.Building{
		Code:        b.Code,
		Name:        b.Name,
		LongName:    b.LongName,
		Address:     b.Address,
		Latitude:    b.Latitude,
		Longitude:   b.Longitude,
		Services:    []string{},
		Departments: []string{},
	}, nil
}

func (r *BuildingDataRepository) GetCampusPolygons(campus string) ([]domain.BuildingPolygon, error) {
	if err := r.ensureLoaded(); err != nil {
		return nil, err
	}

	cKey := strings.ToUpper(strings.TrimSpace(campus))
	buildings, ok := r.byCampus[cKey]
	if !ok {
		return nil, domain.ErrNotFound
	}

	result := []domain.BuildingPolygon{}

	for _, b := range buildings {
		if b.Shape == nil || len(b.Shape.Coordinates) == 0 || len(b.Shape.Coordinates[0]) == 0 {
			continue
		}

		ring := b.Shape.Coordinates[0]
		polygon := []domain.LatLng{}

		for _, pair := range ring {
			if len(pair) < 2 {
				continue
			}
			polygon = append(polygon, domain.LatLng{
				Lat: pair[1],
				Lng: pair[0],
			})
		}

		result = append(result, domain.BuildingPolygon{
			Code:    b.Code,
			Polygon: polygon,
		})
	}

	return result, nil
}
