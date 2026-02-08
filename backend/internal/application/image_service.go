package application

import (
	"fmt"
)

type ImageService interface {
	GetBuildingImages(code string) ([]string, error)
}

type imageService struct {
	buildingService *BuildingService
	placesClient    PlacesClient
}

func NewImageService(
	buildingService *BuildingService,
	placesClient PlacesClient,
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