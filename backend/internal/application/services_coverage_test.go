package application

import (
	"errors"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/works-on-my-machine-390/concordia-waze/internal/domain"
)

type fakeBuildingRepo struct {
	b      *domain.Building
	err    error
	allMap map[string][]domain.BuildingSummary
}

type fakeBuildingService struct {
	building *domain.Building
	floor    *domain.Floor
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

func (f *fakeBuildingRepo) GetAllBuildingsByCampus() (map[string][]domain.BuildingSummary, error) {
	if f.allMap != nil {
		return f.allMap, nil
	}
	return nil, f.err
}

func (f *fakePlacesClient) TextSearchPlaces(input string, lat, lng float64, maxDistanceInMeters int, rankPreference string) ([]domain.Building, error) {
	return nil, nil
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

type fakeFloorRepo struct {
	// keyed by normalized building code (uppercased, trimmed)
	floors map[string][]domain.Floor
	err    error
}

func (f *fakeFloorRepo) GetBuildingFloors(code string) ([]domain.Floor, error) {
	if f.err != nil {
		return nil, f.err
	}
	k := strings.ToUpper(strings.TrimSpace(code))
	m, ok := f.floors[k]
	if !ok {
		return nil, domain.ErrNotFound
	}
	return m, nil
}

type countingPlacesClient struct {
	placeID     string
	hours       domain.OpeningHours
	err         error
	FindCalls   int
	HoursCalls  int
	images      []string
	TextCalls   int
	TextResults []domain.Building
}

func (c *countingPlacesClient) FindPlaceID(name string, lat, lng float64) (string, error) {
	c.FindCalls++
	if c.err != nil {
		return "", c.err
	}
	return c.placeID, nil
}

func (c *countingPlacesClient) GetOpeningHours(placeID string) (domain.OpeningHours, error) {
	c.HoursCalls++
	if c.err != nil {
		return nil, c.err
	}
	return c.hours, nil
}

func (c *countingPlacesClient) GetPhotoURLs(placeID string) ([]string, error) {
	if c.err != nil {
		return nil, c.err
	}
	return c.images, nil
}

func (c *countingPlacesClient) TextSearchPlaces(input string, lat, lng float64, maxDistanceInMeters int, rankPreference string) ([]domain.Building, error) {
	c.TextCalls++
	if c.err != nil {
		return nil, c.err
	}
	if c.TextResults != nil {
		return c.TextResults, nil
	}
	return []domain.Building{}, nil
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

	cacheDir := t.TempDir()
	svc := NewBuildingService(repo, nil, fp, cacheDir)

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

	cacheDir := t.TempDir()
	svc := NewBuildingService(repo, nil, fp, cacheDir)

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
	cacheDir := t.TempDir()
	svc := NewBuildingService(repo, nil, nil, cacheDir)

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

func TestBuildingService_GetAllBuildingsByCampus_Success(t *testing.T) {
	repo := &fakeBuildingRepo{
		allMap: map[string][]domain.BuildingSummary{
			"SGW": {
				{Code: "MB", Name: "MB Building", LongName: "John Molson Building", Campus: "SGW"},
			},
			"LOY": {
				{Code: "VL", Name: "Vanier Library", LongName: "Vanier Library Building", Campus: "LOY"},
			},
		},
	}
	cacheDir := t.TempDir()
	svc := NewBuildingService(repo, nil, nil, cacheDir)

	grouped, err := svc.GetAllBuildingsByCampus(false)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	sgwList, ok := grouped["SGW"]
	if !ok {
		t.Fatalf("expected SGW key present")
	}
	if len(sgwList) != 1 {
		t.Fatalf("expected 1 SGW building, got %d", len(sgwList))
	}
	if sgwList[0].Code != "MB" || sgwList[0].Campus != "SGW" {
		t.Fatalf("unexpected SGW entry: %+v", sgwList[0])
	}

	loyList, ok := grouped["LOY"]
	if !ok {
		t.Fatalf("expected LOY key present")
	}
	if len(loyList) != 1 {
		t.Fatalf("expected 1 LOY building, got %d", len(loyList))
	}
	if loyList[0].Code != "VL" || loyList[0].Campus != "LOY" {
		t.Fatalf("unexpected LOY entry: %+v", loyList[0])
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

func TestFetchOpeningHours_Success(t *testing.T) {
	repo := &fakeBuildingRepo{
		b: &domain.Building{
			Code:      "LS",
			LongName:  "Learning Square",
			Latitude:  45.49,
			Longitude: -73.57,
		},
	}

	fp := &fakePlacesClient{
		placeID: "place123",
		hours: domain.OpeningHours{
			"monday":    {Open: "08:00", Close: "18:00"},
			"wednesday": {Open: "09:00", Close: "17:00"},
		},
	}

	// Construct a real BuildingService (backed by our fake repo) and pass its pointer into HoursService.
	cacheDir := t.TempDir()
	buildingSvcPtr := NewBuildingService(repo, nil, nil, cacheDir)

	hsvc := NewHoursService(buildingSvcPtr, fp)

	out, err := hsvc.FetchOpeningHours("LS")
	assert.NoError(t, err)
	assert.NotNil(t, out)

	// Returned building should be a copy with OpeningHours attached.
	assert.Equal(t, "LS", out.Code)
	assert.NotNil(t, out.OpeningHours)
	assert.Equal(t, "08:00", out.OpeningHours["monday"].Open)

	assert.Nil(t, repo.b.OpeningHours)
}

func TestFetchOpeningHours_GetBuildingError(t *testing.T) {
	repo := &fakeBuildingRepo{
		err: errors.New("not found"),
	}
	cacheDir := t.TempDir()
	buildingSvcPtr := NewBuildingService(repo, nil, nil, cacheDir)

	hsvc := NewHoursService(buildingSvcPtr, &fakePlacesClient{})

	_, err := hsvc.FetchOpeningHours("MISSING")
	assert.Error(t, err)
}

func TestFetchOpeningHours_FindPlaceIDError(t *testing.T) {
	repo := &fakeBuildingRepo{
		b: &domain.Building{
			Code:      "LS",
			LongName:  "Learning Square",
			Latitude:  45.49,
			Longitude: -73.57,
		},
	}

	fp := &fakePlacesClient{
		err: errors.New("places find error"),
	}

	cacheDir := t.TempDir()
	buildingSvcPtr := NewBuildingService(repo, nil, nil, cacheDir)

	hsvc := NewHoursService(buildingSvcPtr, fp)

	_, err := hsvc.FetchOpeningHours("LS")
	assert.Error(t, err)
}

func TestFetchOpeningHours_GetOpeningHoursError(t *testing.T) {
	repo := &fakeBuildingRepo{
		b: &domain.Building{
			Code:      "LS",
			LongName:  "Learning Square",
			Latitude:  45.49,
			Longitude: -73.57,
		},
	}

	fp := &fakePlacesClient{
		placeID: "place123",
		err:     errors.New("opening hours error"),
	}

	cacheDir := t.TempDir()
	buildingSvcPtr := NewBuildingService(repo, nil, nil, cacheDir)

	hsvc := NewHoursService(buildingSvcPtr, fp)

	_, err := hsvc.FetchOpeningHours("LS")
	assert.Error(t, err)
}

func TestFetchOpeningHours_EmptyHours(t *testing.T) {
	repo := &fakeBuildingRepo{
		b: &domain.Building{
			Code:      "LS",
			LongName:  "Learning Square",
			Latitude:  45.49,
			Longitude: -73.57,
		},
	}

	// Simulate Places returning an empty (but non-nil) OpeningHours map
	fp := &fakePlacesClient{
		placeID: "place123",
		hours:   domain.OpeningHours{},
	}

	cacheDir := t.TempDir()
	buildingSvcPtr := NewBuildingService(repo, nil, nil, cacheDir)

	hsvc := NewHoursService(buildingSvcPtr, fp)

	out, err := hsvc.FetchOpeningHours("LS")
	assert.NoError(t, err)
	assert.NotNil(t, out)
	// OpeningHours may be empty map; ensure it's present (empty) on returned copy
	if out.OpeningHours == nil {
		t.Fatalf("expected OpeningHours to be non-nil (may be empty), got nil")
	}
}

// New tests for GetBuildingFloors
func TestBuildingService_GetBuildingFloors_Success(t *testing.T) {
	repo := &fakeBuildingRepo{}
	floorMap := map[string][]domain.Floor{
		"MB": {
			{FloorName: "floor2", FloorNumber: 2, ImgPath: "f1.png"},
			{FloorName: "floor2", FloorNumber: 3, ImgPath: "f2.png"},
		},
	}
	frepo := &fakeFloorRepo{floors: floorMap}

	cacheDir := t.TempDir()
	svc := NewBuildingService(repo, frepo, nil, cacheDir)

	out, err := svc.GetBuildingFloors("mb")
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if len(out) != 2 {
		t.Fatalf("expected 2 floors, got %d", len(out))
	}
	if out[0].ImgPath != "f1.png" {
		t.Fatalf("unexpected floor 1 imgPath: %s", out[0].ImgPath)
	}
}

func TestBuildingService_GetBuildingFloors_NotFound(t *testing.T) {
	repo := &fakeBuildingRepo{}
	frepo := &fakeFloorRepo{floors: map[string][]domain.Floor{}}

	cacheDir := t.TempDir()
	svc := NewBuildingService(repo, frepo, nil, cacheDir)

	_, err := svc.GetBuildingFloors("UNKNOWN")
	if err == nil {
		t.Fatalf("expected error, got nil")
	}
	if err != domain.ErrNotFound {
		t.Fatalf("expected domain.ErrNotFound, got %v", err)
	}
}

func TestBuildingService_GetBuildingFloors_RepoError(t *testing.T) {
	repo := &fakeBuildingRepo{}
	frepo := &fakeFloorRepo{err: errors.New("boom")}

	cacheDir := t.TempDir()
	svc := NewBuildingService(repo, frepo, nil, cacheDir)

	_, err := svc.GetBuildingFloors("MB")
	if err == nil {
		t.Fatalf("expected error, got nil")
	}
	if err.Error() != "boom" {
		t.Fatalf("expected repo error 'boom', got %v", err)
	}
}

func TestCache_PersistAndHitAvoidsAPI(t *testing.T) {
	repo := &fakeBuildingRepo{
		b: &domain.Building{
			Code:      "MB",
			LongName:  "John Molson Building",
			Latitude:  45.497000,
			Longitude: -73.579200,
		},
	}

	// First places client behaves normally and will populate the cache.
	fp := &fakePlacesClient{
		placeID: "place-123",
		hours: domain.OpeningHours{
			"monday": {Open: "08:00", Close: "18:00"},
		},
	}

	cacheDir := t.TempDir()
	svc := NewBuildingService(repo, nil, fp, cacheDir)

	b, err := svc.GetBuilding("MB")
	if err != nil {
		t.Fatalf("unexpected error on first call: %v", err)
	}
	if b.OpeningHours == nil {
		t.Fatalf("expected OpeningHours attached on first call")
	}
	if b.OpeningHours["monday"].Open != "08:00" {
		t.Fatalf("unexpected opening hours: %+v", b.OpeningHours)
	}

	// Now create a new service that loads the cache from disk but has a places client that would error if called.
	placesThatMustNotBeCalled := &fakePlacesClient{
		err: errors.New("places should not be called when cache present"),
	}
	svc2 := NewBuildingService(repo, nil, placesThatMustNotBeCalled, cacheDir)

	// If the cache was correctly persisted and loaded, this call should NOT invoke the places client and should succeed.
	b2, err := svc2.GetBuilding("MB")
	if err != nil {
		t.Fatalf("expected cached lookup to succeed without calling places client, got error: %v", err)
	}
	if b2.OpeningHours == nil {
		t.Fatalf("expected OpeningHours attached from cache")
	}
	assert.Equal(t, "08:00", b2.OpeningHours["monday"].Open)
}

func TestCache_MissForDifferentBuildingTriggersAPI_CountsCalls(t *testing.T) {
	repo := &fakeBuildingRepo{}
	cacheDir := t.TempDir()

	// Populate cache for MB
	repo.b = &domain.Building{
		Code:      "MB",
		LongName:  "John Molson Building",
		Latitude:  45.497000,
		Longitude: -73.579200,
	}
	placesMB := &countingPlacesClient{
		placeID: "place-mb",
		hours: domain.OpeningHours{
			"monday": {Open: "08:00", Close: "18:00"},
		},
	}
	svc := NewBuildingService(repo, nil, placesMB, cacheDir)
	if _, err := svc.GetBuilding("MB"); err != nil {
		t.Fatalf("unexpected error populating MB cache: %v", err)
	}
	placeidPath := filepath.Join(cacheDir, "placeid_cache.json")
	if _, err := os.Stat(placeidPath); err != nil {
		t.Fatalf("expected placeid cache file, stat error: %v", err)
	}

	// Now request a different building
	// The counting places client verifies that it is invoked
	repo.b = &domain.Building{
		Code:      "LB",
		LongName:  "Library Building",
		Latitude:  45.498000,
		Longitude: -73.580000,
	}
	placesLB := &countingPlacesClient{
		placeID: "place-lb",
		hours: domain.OpeningHours{
			"tuesday": {Open: "09:00", Close: "17:00"},
		},
	}
	svc2 := NewBuildingService(repo, nil, placesLB, cacheDir)
	b, err := svc2.GetBuilding("LB")
	if err != nil {
		t.Fatalf("unexpected error fetching LB: %v", err)
	}
	// verify building returned and hours attached from LB places client
	if b.OpeningHours == nil {
		t.Fatalf("expected OpeningHours from LB places client, got nil")
	}
	assert.Equal(t, 1, placesLB.FindCalls, "expected FindPlaceID called once for LB")
	assert.Equal(t, 1, placesLB.HoursCalls, "expected GetOpeningHours called once for LB")
}
