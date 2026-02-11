package application

import (
	"errors"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/works-on-my-machine-390/concordia-waze/internal/domain"
)

type fakeBuildingService struct {
	building *domain.Building
	err      error
}

func (f *fakeBuildingService) GetBuilding(code string) (*domain.Building, error) {
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

func TestImageServiceGetBuildingImagesSuccess(t *testing.T) {
	buildingSvc := &fakeBuildingService{
		building: &domain.Building{
			Code:      "LS",
			LongName:  "Learning Square",
			Address:   "1535 DeMaisonneuve W",
			Latitude:  45.49,
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

func TestImageServiceGetBuildingImagesBuildingNotFound(t *testing.T) {
	buildingSvc := &fakeBuildingService{
		err: errors.New("not found"),
	}

	service := NewImageService(buildingSvc, &fakePlacesClient{})

	images, err := service.GetBuildingImages("LS")

	assert.Error(t, err)
	assert.Nil(t, images)
}

func TestImageServiceGetBuildingImagesPlacesError(t *testing.T) {
	buildingSvc := &fakeBuildingService{
		building: &domain.Building{
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
