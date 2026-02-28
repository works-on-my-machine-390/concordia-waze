package application

import (
	"fmt"
	"mime"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/works-on-my-machine-390/concordia-waze/internal/application/google"
	"github.com/works-on-my-machine-390/concordia-waze/internal/domain"
)

type BuildingGetter interface {
	GetBuilding(code string) (*domain.Building, error)
}

type ImageService interface {
	GetBuildingImages(code string) ([]string, error)
	LoadImage(baseDir, relPath string) ([]byte, string, error)
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

// takes a base directory and a relative path, and returns the file's bytes and content type
func (s *imageService) LoadImage(baseDir, relPath string) ([]byte, string, error) {
	clean := filepath.Clean("/" + relPath)
	clean = strings.TrimPrefix(clean, "/")
	full := filepath.Join(baseDir, clean)

	absBase, err := filepath.Abs(baseDir)
	if err != nil {
		return nil, "", err
	}
	absFull, err := filepath.Abs(full)
	if err != nil {
		return nil, "", err
	}
	if absFull != absBase && !strings.HasPrefix(absFull, absBase+string(os.PathSeparator)) {
		return nil, "", fmt.Errorf("invalid path")
	}

	data, err := os.ReadFile(full)
	if err != nil {
		fmt.Printf("error reading file %s: %v\n", full, err)
		return nil, "", err
	}

	ct := mime.TypeByExtension(filepath.Ext(full))
	if ct == "" {
		ct = http.DetectContentType(data)
	}
	return data, ct, nil
}
