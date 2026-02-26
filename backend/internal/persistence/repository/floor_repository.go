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
			r.loadErr = fmt.Errorf("read json: %w", err)
			return
		}

		var parsedMap map[string][]rawFloor

		var parsedArr []map[string][]rawFloor
		if err2 := json.Unmarshal(bytes, &parsedArr); err2 != nil {
			r.loadErr = fmt.Errorf("parse json: %w / %v", err, err2)
			return
		}
		parsedMap = make(map[string][]rawFloor)
		for _, m := range parsedArr {
			for k, v := range m {
				parsedMap[k] = append(parsedMap[k], v...)
			}
		}

		r.byCode = make(map[string][]domain.Floor)

		for buildingCode, floorsMap := range parsedMap {

			//making sure building code is in a consistent format (trimmed and uppercased)
			bKey := strings.ToUpper(strings.TrimSpace(buildingCode))
			if r.byCode[bKey] == nil {
				r.byCode[bKey] = make([]domain.Floor, 0)
			}

			for _, rf := range floorsMap {

				f := domain.Floor{
					FloorName:   rf.Name,
					FloorNumber: rf.Number,
					ImgPath:     rf.ImgPath,
					Vertices:    make([]domain.Coordinates, len(rf.Vertices)),
					Edges:       make([]domain.Edge, 0, len(rf.Edges)),
					POIs:        make([]domain.PointOfInterest, 0, len(rf.POI)),
				}

				// map vertices (raw x,y -> domain Coordinates)
				for i, rc := range rf.Vertices {
					f.Vertices[i] = domain.Coordinates{
						X: rc.X,
						Y: rc.Y,
					}
				}

				// map edges
				for _, e := range rf.Edges {
					if len(e) >= 2 {
						f.Edges = append(f.Edges, domain.Edge{
							StartVertex: e[0],
							EndVertex:   e[1],
						})
					}
				}

				// map POIs
				for _, rp := range rf.POI {
					poi := domain.PointOfInterest{
						Name: rp.Name,
						Type: rp.Type,
						Position: domain.Coordinates{
							X: rp.Position.X,
							Y: rp.Position.Y,
						},
						Polygon: make([]domain.Coordinates, len(rp.Polygon)),
					}
					for i, p := range rp.Polygon {
						poi.Polygon[i] = domain.Coordinates{
							X: p.X,
							Y: p.Y,
						}
					}
					f.POIs = append(f.POIs, poi)
				}

				r.byCode[bKey] = append(r.byCode[bKey], f)
			}
		}
	})

	return r.loadErr
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
