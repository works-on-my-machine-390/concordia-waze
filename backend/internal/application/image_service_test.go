package application

import (
	"errors"
	"testing"

	"github.com/stretchr/testify/assert"
)

type fakeBuildingService struct {
	building *Building
	err      error
}

func (f *fakeBuildingService) GetBuilding(code string) (*Building, error) {
	return f.building, f.err
}

type fakePlacesClient struct {
	placeID string
	images  []string
	err     error
}

func (f *fakePlacesClient) FindPlaceID(string, float64, float64) (string, error) {
	return f.placeID, f.err
}

func (f *fakePlacesClient) GetPhotoURLs(string) ([]string, error) {
	return f.images, f.err
}

func TestImageService_GetBuildingImages_Success(t *testing.T) {
	buildingSvc := &fakeBuildingService{
		building: &Building{
			Code:     "LS",
			LongName: "Learning Square",
			Address:  "1535 DeMaisonneuve W",
			Latitude: 45.49,
			Longitude: -73.57,
		},
	}

	places := &fakePlacesClient{
		placeID: "place123",
		images: []string{
			"https://img1",
			"https://img2",
		},
	}

	service := NewImageService(buildingSvc, places)

	images, err := service.GetBuildingImages("LS")

	assert.NoError(t, err)
	assert.Len(t, images, 2)
	assert.Equal(t, "https://img1", images[0])
}

func TestImageService_GetBuildingImages_BuildingNotFound(t *testing.T) {
	buildingSvc := &fakeBuildingService{
		err: errors.New("not found"),
	}

	service := NewImageService(buildingSvc, &fakePlacesClient{})

	images, err := service.GetBuildingImages("LS")

	assert.Error(t, err)
	assert.Nil(t, images)
}

func TestImageService_GetBuildingImages_PlacesError(t *testing.T) {
	buildingSvc := &fakeBuildingService{
		building: &Building{
			LongName: "Learning Square",
			Address:  "1535 DeMaisonneuve W",
		},
	}

	places := &fakePlacesClient{
		err: errors.New("google error"),
	}

	service := NewImageService(buildingSvc, places)

	images, err := service.GetBuildingImages("LS")

	assert.Error(t, err)
	assert.Nil(t, images)
}
