package application

import (
	"fmt"

	"github.com/works-on-my-machine-390/concordia-waze/internal/application/google"
	"github.com/works-on-my-machine-390/concordia-waze/internal/domain"
)

type BuildingGetter interface {
	GetBuilding(code string) (*domain.Building, error)
}

type ImageService interface {
	GetBuildingImages(code string) ([]string, error)
}

type imageService struct {
	buildingService BuildingGetter
	placesClient    google.PlacesClient
}

func NewImageService(
	buildingService BuildingGetter,
	placesClient google.PlacesClient,
) ImageService {
	return &imageService{
		buildingService: buildingService,
		placesClient:    placesClient,
	}
}

func (s *imageService) GetBuildingImages(code string) ([]string, error) {
	building, err := s.buildingService.GetBuilding(code)
	if err != nil {
		return nil, err
	}

	input := fmt.Sprintf(
		"%s %s, Montreal, QC, Canada",
		building.LongName,
		building.Address,
	)

	placeID, err := s.placesClient.FindPlaceID(
		input,
		building.Latitude,
		building.Longitude,
	)
	if err != nil {
		return nil, err
	}

	return s.placesClient.GetPhotoURLs(placeID)
}
