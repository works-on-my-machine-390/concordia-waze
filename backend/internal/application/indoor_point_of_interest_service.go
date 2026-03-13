package application

import (
	"fmt"
	"math"
	"sort"

	"github.com/works-on-my-machine-390/concordia-waze/internal/domain"
	"github.com/works-on-my-machine-390/concordia-waze/internal/persistence/repository"
)

type IndoorPointOfInterestGetter interface {
	GetNearbyIndoorPOIs(building string, floor int, x, y float64, radiusMeters int, sameFloor bool, limit int) ([]domain.IndoorPOI, error)
}

type indoorPointOfInterestService struct {
	repo repository.IndoorPOIGetter
}

func NewIndoorPointOfInterestService(repo repository.IndoorPOIGetter) IndoorPointOfInterestGetter {
	return &indoorPointOfInterestService{repo: repo}
}

func (s *indoorPointOfInterestService) GetNearbyIndoorPOIs(building string, floor int, x, y float64, radiusMeters int, sameFloor bool, limit int) ([]domain.IndoorPOI, error) {
	if building == "" {
		return nil, fmt.Errorf("building cannot be empty")
	}
	if radiusMeters <= 0 {
		radiusMeters = 40
	}
	if limit <= 0 {
		limit = 30
	}

	pois, err := s.repo.GetByBuilding(building)
	if err != nil {
		return nil, err
	}

	userPos := domain.IndoorPosition{X: x, Y: y}
	radius := float64(radiusMeters)

	type scored struct {
		poi  domain.IndoorPOI
		dist float64
	}
	scoredPOIs := make([]scored, 0)

	for _, p := range pois {
		if sameFloor && p.Floor != floor {
			continue
		}
		d := distance(userPos, p.Position)
		if d <= radius {
			scoredPOIs = append(scoredPOIs, scored{poi: p, dist: d})
		}
	}

	sort.Slice(scoredPOIs, func(i, j int) bool { return scoredPOIs[i].dist < scoredPOIs[j].dist })

	out := make([]domain.IndoorPOI, 0, min(limit, len(scoredPOIs)))
	for i := 0; i < len(scoredPOIs) && i < limit; i++ {
		out = append(out, scoredPOIs[i].poi)
	}
	return out, nil
}

func distance(a, b domain.IndoorPosition) float64 {
	dx := a.X - b.X
	dy := a.Y - b.Y
	return math.Sqrt(dx*dx + dy*dy)
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
