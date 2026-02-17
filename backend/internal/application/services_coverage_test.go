package application

import (
	"errors"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/works-on-my-machine-390/concordia-waze/internal/domain"
)

type fakeBuildingRepo struct {
	b   *domain.Building
	err error
}

type fakeBuildingService struct {
	building *domain.Building
	err      error
}

func (f *fakeBuildingService) GetBuilding(code string) (*domain.Building, error) {
	return f.building, f.err
}

func (f *fakeBuildingRepo) GetBuilding(code string) (*domain.Building, error) {
	if f.err != nil {
		return nil, f.err
	}
	return f.b, nil
}

type fakeCampusRepo struct {
	polys []domain.BuildingPolygon
	err   error
}

func (f *fakeCampusRepo) GetCampusPolygons(campus string) ([]domain.BuildingPolygon, error) {
	if f.err != nil {
		return nil, f.err
	}
	return f.polys, nil
}

type fakePlacesClient struct {
	placeID string
	images  []string
	hours   domain.OpeningHours
	err     error
}

func (f *fakePlacesClient) FindPlaceID(input string, lat, lng float64) (string, error) {
	if f.err != nil {
		return "", f.err
	}
	return f.placeID, nil
}

func (f *fakePlacesClient) GetOpeningHours(placeID string) (domain.OpeningHours, error) {
	if f.err != nil {
		return nil, f.err
	}
	return f.hours, nil
}

func (f *fakePlacesClient) GetPhotoURLs(string) ([]string, error) {
	return f.images, f.err
}

func TestBuildingService_GetBuilding_Success(t *testing.T) {
	repo := &fakeBuildingRepo{
		b: &domain.Building{
			Code:     "MB",
			LongName: "John Molson Building",
		},
	}

	fp := &fakePlacesClient{
		placeID: "place123",
		hours: domain.OpeningHours{
			"monday": {Open: "08:00", Close: "18:00"},
		},
	}

	svc := NewBuildingService(repo, fp)

	b, err := svc.GetBuilding("MB")
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if b == nil || b.Code != "MB" {
		t.Fatalf("expected MB building, got %+v", b)
	}
	// Expect opening hours to be attached on returned copy
	if b.OpeningHours == nil {
		t.Fatalf("expected OpeningHours to be present on returned building")
	}
	if b.OpeningHours["monday"].Open != "08:00" {
		t.Fatalf("unexpected opening hours: %+v", b.OpeningHours)
	}
	// original repo building should remain unmodified (service returns a copy)
	if repo.b.OpeningHours != nil {
		t.Fatalf("expected repo building OpeningHours to remain nil, got %+v", repo.b.OpeningHours)
	}
}

func TestBuildingService_GetBuilding_PlacesErrorNonFatal(t *testing.T) {
	repo := &fakeBuildingRepo{
		b: &domain.Building{
			Code:     "MB",
			LongName: "John Molson Building",
		},
	}

	fp := &fakePlacesClient{
		err: errors.New("places error"),
	}

	svc := NewBuildingService(repo, fp)

	b, err := svc.GetBuilding("MB")
	if err != nil {
		t.Fatalf("expected no error even if places lookup fails, got %v", err)
	}
	if b == nil || b.Code != "MB" {
		t.Fatalf("expected MB building, got %+v", b)
	}
	// Because places errored, OpeningHours should not be attached (service swallows places errors)
	if b.OpeningHours != nil {
		t.Fatalf("expected OpeningHours to be nil when places lookup fails, got %+v", b.OpeningHours)
	}
}

func TestBuildingService_GetBuilding_NotFound(t *testing.T) {
	repo := &fakeBuildingRepo{err: domain.ErrNotFound}
	// places client may be nil because repo returns error before places are used
	svc := NewBuildingService(repo, nil)

	_, err := svc.GetBuilding("XYZ")
	if err == nil {
		t.Fatalf("expected error, got nil")
	}
	if err != domain.ErrNotFound {
		t.Fatalf("expected ErrNotFound, got %v", err)
	}
}

func TestCampusService_GetCampusBuildings_Success(t *testing.T) {
	repo := &fakeCampusRepo{
		polys: []domain.BuildingPolygon{
			{Code: "MB", Polygon: []domain.LatLng{{Lat: 45.0, Lng: -73.0}}},
		},
	}
	svc := NewCampusService(repo)

	out, err := svc.GetCampusBuildings("SGW")
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if len(out) != 1 || out[0].Code != "MB" {
		t.Fatalf("unexpected result: %+v", out)
	}
}

func TestCampusService_GetCampusBuildings_NotFound(t *testing.T) {
	repo := &fakeCampusRepo{err: domain.ErrNotFound}
	svc := NewCampusService(repo)

	_, err := svc.GetCampusBuildings("ABC")
	if err == nil {
		t.Fatalf("expected error, got nil")
	}
	if err != domain.ErrNotFound {
		t.Fatalf("expected ErrNotFound, got %v", err)
	}
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
