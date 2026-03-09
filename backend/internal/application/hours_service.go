package application

import (
	"fmt"

	"github.com/works-on-my-machine-390/concordia-waze/internal/domain"
)

type PlacesClient interface {
	FindPlaceID(name string, lat, lng float64) (string, error)
	GetOpeningHours(placeID string) (domain.OpeningHours, error)
}

type HoursService struct {
	buildingSvc *BuildingService
	places      PlacesClient
}

func NewHoursService(buildingSvc *BuildingService, places PlacesClient) *HoursService {
	return &HoursService{buildingSvc: buildingSvc, places: places}
}

func (s *HoursService) FetchOpeningHours(code string) (*domain.Building, error) {
	b, err := s.buildingSvc.GetBuilding(code)
	if err != nil {
		return nil, fmt.Errorf("get building: %w", err)
	}

	placeID, err := s.places.FindPlaceID(b.LongName, b.Latitude, b.Longitude)
	if err != nil {
		return nil, fmt.Errorf("find place id: %w", err)
	}

	hours, err := s.places.GetOpeningHours(placeID)
	if err != nil {
		return nil, fmt.Errorf("get opening hours: %w", err)
	}

	// Return a copy of the building with OpeningHours attached to avoid mutating the source.
	nb := *b
	nb.OpeningHours = hours
	return &nb, nil
}
