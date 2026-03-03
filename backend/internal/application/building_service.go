package application

import (
	"github.com/works-on-my-machine-390/concordia-waze/internal/application/google"
	"github.com/works-on-my-machine-390/concordia-waze/internal/constants"
	"github.com/works-on-my-machine-390/concordia-waze/internal/domain"
	"github.com/works-on-my-machine-390/concordia-waze/internal/utils"
)

type BuildingReader interface {
	GetBuilding(code string) (*domain.Building, error)
	GetAllBuildingsByCampus() (map[string][]domain.BuildingSummary, error)
}

type FloorReader interface {
	GetBuildingFloors(code string) ([]domain.Floor, error)
}

type BuildingService struct {
	buildingRepo BuildingReader
	floorRepo    FloorReader
	places       google.PlacesClient
}

func NewBuildingService(buildingRepo BuildingReader, floorRepo FloorReader, places google.PlacesClient) *BuildingService {
	return &BuildingService{buildingRepo: buildingRepo, floorRepo: floorRepo, places: places}
}

func (s *BuildingService) GetBuilding(code string) (*domain.Building, error) {
	b, err := s.buildingRepo.GetBuilding(code)
	if err != nil {
		return nil, err
	}

	// operate on a copy
	nb := *b

	// 1) Try with building's own data
	if attachOpeningHoursIfFound(&nb, s.places, nb.LongName, nb.Latitude, nb.Longitude) {
		return &nb, nil
	}

	// 2) Try campus-based fallback
	if name, pos, ok := campusFallback(nb.Latitude, nb.Longitude); ok {
		attachOpeningHoursIfFound(&nb, s.places, name, pos.Lat, pos.Lng)
	}

	return &nb, nil
}

func attachOpeningHoursIfFound(dst *domain.Building, places google.PlacesClient, input string, lat, lng float64) bool {
	if places == nil || input == "" {
		return false
	}

	placeID, err := places.FindPlaceID(input, lat, lng)
	if err != nil || placeID == "" {
		return false
	}

	hours, err := places.GetOpeningHours(placeID)
	if err != nil || len(hours) == 0 {
		return false
	}

	dst.OpeningHours = hours
	return true
}

func campusFallback(lat, lng float64) (string, domain.LatLng, bool) {
	// If building coordinates are not set, cannot determine proximity.
	if lat == 0 && lng == 0 {
		return "", domain.LatLng{}, false
	}

	loy := constants.LOYCampusPosition
	sgw := constants.SGWCampusPosition

	dLoy := utils.SqDist(lat, lng, loy.Lat, loy.Lng)
	dSgw := utils.SqDist(lat, lng, sgw.Lat, sgw.Lng)

	if dLoy <= dSgw {
		return constants.LoyolaCampusName, loy, true
	}
	return constants.SirGeorgeWilliamsCampusName, sgw, true
}

func (s *BuildingService) GetAllBuildingsByCampus() (map[string][]domain.BuildingSummary, error) {
	return s.buildingRepo.GetAllBuildingsByCampus()
}

func (s *BuildingService) GetBuildingFloors(code string) ([]domain.Floor, error) {
	return s.floorRepo.GetBuildingFloors(code)
}
