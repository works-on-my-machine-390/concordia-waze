package handler

import (
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/works-on-my-machine-390/concordia-waze/internal/application"
	"github.com/works-on-my-machine-390/concordia-waze/internal/domain"
)

type fakeBuildingRepo struct {
	building    *domain.Building
	buildingErr error
	allMap      map[string][]domain.BuildingSummary
	campusErr   error
}

type fakePlacesClient struct {
	placeID string
	images  []string
	hours   domain.OpeningHours
	err     error
}

type fakeFloorRepo struct {
	floors map[string][]domain.Floor
	err    error
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

func (f *fakePlacesClient) TextSearchPlaces(input string, lat, lng float64, maxDistanceInMeters int, rankPreference string) ([]domain.Building, error) {
	return nil, nil
}

func (f *fakeBuildingRepo) GetBuilding(code string) (*domain.Building, error) {
	if f.buildingErr != nil {
		return nil, f.buildingErr
	}
	return f.building, nil
}

func (f *fakeBuildingRepo) GetAllBuildingsByCampus() (map[string][]domain.BuildingSummary, error) {
	if f.campusErr != nil {
		return nil, f.campusErr
	}
	if f.allMap != nil {
		return f.allMap, nil
	}
	return map[string][]domain.BuildingSummary{}, nil
}

func (f *fakeFloorRepo) GetBuildingFloors(code string) ([]domain.Floor, error) {
	if f.err != nil {
		return nil, f.err
	}
	if f.floors == nil {
		return nil, domain.ErrNotFound
	}
	k := strings.ToUpper(strings.TrimSpace(code))
	m, ok := f.floors[k]
	if !ok {
		return nil, domain.ErrNotFound
	}
	return m, nil
}

func TestBuildingHandler_GetBuilding_Success200(t *testing.T) {
	gin.SetMode(gin.TestMode)

	repo := &fakeBuildingRepo{
		building: &domain.Building{
			Code:        "MB",
			Name:        "John Molson Building",
			LongName:    "John Molson School of Business",
			Address:     "1450 Guy St, Montreal",
			Latitude:    45.4970,
			Longitude:   -73.5792,
			Services:    []string{},
			Departments: []string{},
		},
	}

	fp := &fakePlacesClient{
		placeID: "place123",
		hours: domain.OpeningHours{
			"monday": {Open: "08:00", Close: "18:00"},
		},
	}

	cacheDir := t.TempDir()
	svc := application.NewBuildingService(repo, nil, fp, cacheDir)
	h := NewBuildingHandler(svc)

	r := gin.New()
	r.GET("/buildings/:code", h.GetBuilding)

	req := httptest.NewRequest(http.MethodGet, "/buildings/MB", nil)
	w := httptest.NewRecorder()

	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d, body=%s", w.Code, w.Body.String())
	}

	body := w.Body.String()
	if !strings.Contains(body, `"code":"MB"`) {
		t.Fatalf("expected response to contain code MB, got body=%s", body)
	}
	if !strings.Contains(body, `"name":"John Molson Building"`) {
		t.Fatalf("expected response to contain building name, got body=%s", body)
	}
}

func TestBuildingHandler_GetBuilding_NotFound404(t *testing.T) {
	gin.SetMode(gin.TestMode)

	repo := &fakeBuildingRepo{buildingErr: domain.ErrNotFound}

	fp := &fakePlacesClient{
		placeID: "place123",
		hours: domain.OpeningHours{
			"monday": {Open: "08:00", Close: "18:00"},
		},
	}

	cacheDir := t.TempDir()
	svc := application.NewBuildingService(repo, nil, fp, cacheDir)
	h := NewBuildingHandler(svc)

	r := gin.New()
	r.GET("/buildings/:code", h.GetBuilding)

	req := httptest.NewRequest(http.MethodGet, "/buildings/XYZ", nil)
	w := httptest.NewRecorder()

	r.ServeHTTP(w, req)

	if w.Code != http.StatusNotFound {
		t.Fatalf("expected status 404, got %d, body=%s", w.Code, w.Body.String())
	}
	if !strings.Contains(w.Body.String(), "building not found") {
		t.Fatalf("expected 'building not found', got body=%s", w.Body.String())
	}
}

func TestBuildingHandler_GetBuilding_InternalError500(t *testing.T) {
	gin.SetMode(gin.TestMode)

	repo := &fakeBuildingRepo{buildingErr: errors.New("EVERYTHING EXPLODES")}

	fp := &fakePlacesClient{
		placeID: "place123",
		hours: domain.OpeningHours{
			"monday": {Open: "08:00", Close: "18:00"},
		},
	}

	cacheDir := t.TempDir()
	svc := application.NewBuildingService(repo, nil, fp, cacheDir)
	h := NewBuildingHandler(svc)

	r := gin.New()
	r.GET("/buildings/:code", h.GetBuilding)

	req := httptest.NewRequest(http.MethodGet, "/buildings/MB", nil)
	w := httptest.NewRecorder()

	r.ServeHTTP(w, req)

	if w.Code != http.StatusInternalServerError {
		t.Fatalf("expected status 500, got %d, body=%s", w.Code, w.Body.String())
	}
}

func TestBuildingHandler_GetAllBuildingsByCampus_Success200(t *testing.T) {
	gin.SetMode(gin.TestMode)

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
	svc := application.NewBuildingService(repo, nil, nil, cacheDir)
	h := NewBuildingHandler(svc)

	r := gin.New()
	r.GET("/buildings/list", h.GetAllBuildingsByCampus)

	req := httptest.NewRequest(http.MethodGet, "/buildings/list", nil)
	w := httptest.NewRecorder()

	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d, body=%s", w.Code, w.Body.String())
	}
	body := w.Body.String()

	if !strings.Contains(body, `"buildings"`) || !strings.Contains(body, `"SGW"`) || !strings.Contains(body, `"LOY"`) {
		t.Fatalf("unexpected body: %s", body)
	}
}

func TestBuildingHandler_GetFloorsByBuilding_Success200(t *testing.T) {
	gin.SetMode(gin.TestMode)

	repo := &fakeBuildingRepo{}
	floorMap := map[string][]domain.Floor{
		"MB": {
			{FloorName: "floor1", FloorNumber: 1, ImgPath: "f1.svg"},
		},
	}
	frepo := &fakeFloorRepo{floors: floorMap}

	cacheDir := t.TempDir()
	svc := application.NewBuildingService(repo, frepo, nil, cacheDir)
	h := NewBuildingHandler(svc)

	r := gin.New()
	r.GET("/buildings/:code/floors", h.GetFloorsByBuilding)

	req := httptest.NewRequest(http.MethodGet, "/buildings/MB/floors", nil)
	w := httptest.NewRecorder()

	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d, body=%s", w.Code, w.Body.String())
	}
	body := w.Body.String()
	if !strings.Contains(body, `"floors"`) || !strings.Contains(body, `"imgPath":"f1.svg"`) {
		t.Fatalf("unexpected body: %s", body)
	}
}

func TestBuildingHandler_GetFloorsByBuilding_NotFound500(t *testing.T) {
	gin.SetMode(gin.TestMode)

	repo := &fakeBuildingRepo{}
	frepo := &fakeFloorRepo{floors: map[string][]domain.Floor{}}

	cacheDir := t.TempDir()
	svc := application.NewBuildingService(repo, frepo, nil, cacheDir)
	h := NewBuildingHandler(svc)

	r := gin.New()
	r.GET("/buildings/:code/floors", h.GetFloorsByBuilding)

	req := httptest.NewRequest(http.MethodGet, "/buildings/UNKNOWN/floors", nil)
	w := httptest.NewRecorder()

	r.ServeHTTP(w, req)

	if w.Code != http.StatusInternalServerError {
		t.Fatalf("expected status 500 for not-found floor repo, got %d, body=%s", w.Code, w.Body.String())
	}
	if !strings.Contains(w.Body.String(), "not found") {
		t.Fatalf("expected body to contain 'not found', got %s", w.Body.String())
	}
}

func TestBuildingHandler_GetFloorsByBuilding_RepoError500(t *testing.T) {
	gin.SetMode(gin.TestMode)

	repo := &fakeBuildingRepo{}
	frepo := &fakeFloorRepo{err: errors.New("boom")}

	cacheDir := t.TempDir()
	svc := application.NewBuildingService(repo, frepo, nil, cacheDir)
	h := NewBuildingHandler(svc)

	r := gin.New()
	r.GET("/buildings/:code/floors", h.GetFloorsByBuilding)

	req := httptest.NewRequest(http.MethodGet, "/buildings/MB/floors", nil)
	w := httptest.NewRecorder()

	r.ServeHTTP(w, req)

	if w.Code != http.StatusInternalServerError {
		t.Fatalf("expected status 500 for repo error, got %d, body=%s", w.Code, w.Body.String())
	}
	if !strings.Contains(w.Body.String(), "boom") {
		t.Fatalf("expected body to contain 'boom', got %s", w.Body.String())
	}
}
