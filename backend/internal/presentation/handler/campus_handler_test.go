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

func TestCampusHandler_GetCampusBuildings_Success200(t *testing.T) {
	gin.SetMode(gin.TestMode)

	repo := &fakeCampusRepo{
		polys: []domain.BuildingPolygon{
			{
				Code: "MB",
				Polygon: []domain.LatLng{
					{Lat: 45.0, Lng: -73.0},
					{Lat: 45.1, Lng: -73.1},
				},
			},
		},
	}

	svc := application.NewCampusService(repo)
	h := NewCampusHandler(svc)

	r := gin.New()
	r.GET("/campuses/:campus/buildings", h.GetCampusBuildings)

	req := httptest.NewRequest(http.MethodGet, "/campuses/SGW/buildings", nil)
	w := httptest.NewRecorder()

	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d, body=%s", w.Code, w.Body.String())
	}

	body := w.Body.String()
	if !strings.Contains(body, `"campus":"SGW"`) {
		t.Fatalf("expected response to contain campus SGW, got body=%s", body)
	}
	if !strings.Contains(body, `"code":"MB"`) {
		t.Fatalf("expected response to contain building code MB, got body=%s", body)
	}
}

func TestCampusHandler_GetCampusBuildings_InvalidCampus404(t *testing.T) {
	gin.SetMode(gin.TestMode)

	repo := &fakeCampusRepo{err: domain.ErrNotFound}

	svc := application.NewCampusService(repo)
	h := NewCampusHandler(svc)

	r := gin.New()
	r.GET("/campuses/:campus/buildings", h.GetCampusBuildings)

	req := httptest.NewRequest(http.MethodGet, "/campuses/ABC/buildings", nil)
	w := httptest.NewRecorder()

	r.ServeHTTP(w, req)

	if w.Code != http.StatusNotFound {
		t.Fatalf("expected status 404, got %d, body=%s", w.Code, w.Body.String())
	}
	if !strings.Contains(w.Body.String(), "campus not found") {
		t.Fatalf("expected 'campus not found', got body=%s", w.Body.String())
	}
}

func TestCampusHandler_GetCampusBuildings_InternalError500(t *testing.T) {
	gin.SetMode(gin.TestMode)

	repo := &fakeCampusRepo{err: errors.New("boom")}

	svc := application.NewCampusService(repo)
	h := NewCampusHandler(svc)

	r := gin.New()
	r.GET("/campuses/:campus/buildings", h.GetCampusBuildings)

	req := httptest.NewRequest(http.MethodGet, "/campuses/SGW/buildings", nil)
	w := httptest.NewRecorder()

	r.ServeHTTP(w, req)

	if w.Code != http.StatusInternalServerError {
		t.Fatalf("expected status 500, got %d, body=%s", w.Code, w.Body.String())
	}
}
