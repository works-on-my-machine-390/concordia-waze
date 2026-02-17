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

	svc := application.NewBuildingService(repo)
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

	svc := application.NewBuildingService(repo)
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

	svc := application.NewBuildingService(repo)
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
