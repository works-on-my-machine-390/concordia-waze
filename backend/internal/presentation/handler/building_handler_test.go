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
	building *domain.Building
	err      error
}

// This is the ONLY method required by BuildingReader interface
func (r *fakeBuildingRepo) GetBuilding(code string) (*domain.Building, error) {
	if r.err != nil {
		return nil, r.err
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

func (f *fakeBuildingRepo) GetBuilding(code string) (*domain.Building, error) {
	if f.err != nil {
		return nil, f.err
	}
	return r.building, nil
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

	svc := application.NewBuildingService(repo, fp)
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

	repo := &fakeBuildingRepo{
		err: domain.ErrNotFound,
	}

	fp := &fakePlacesClient{
		placeID: "place123",
		hours: domain.OpeningHours{
			"monday": {Open: "08:00", Close: "18:00"},
		},
	}

	svc := application.NewBuildingService(repo, fp)
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

	repo := &fakeBuildingRepo{
		err: errors.New("boom"),
	}

	fp := &fakePlacesClient{
		placeID: "place123",
		hours: domain.OpeningHours{
			"monday": {Open: "08:00", Close: "18:00"},
		},
	}

	svc := application.NewBuildingService(repo, fp)
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
