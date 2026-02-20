package handler

import (
	"errors"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"

	"github.com/works-on-my-machine-390/concordia-waze/internal/application"
	"github.com/works-on-my-machine-390/concordia-waze/internal/domain"
)

type directionsCall struct {
	start domain.LatLng
	end   domain.LatLng
	mode  string
}

type fakeDirectionsFetcher struct {
	resp  domain.DirectionsResponse
	err   error
	calls []directionsCall
}

func (f *fakeDirectionsFetcher) GetDirections(start, end domain.LatLng, mode string) (domain.DirectionsResponse, error) {
	f.calls = append(f.calls, directionsCall{start, end, mode})
	return f.resp, f.err
}

type fakeBuildingReader struct {
	buildings map[string]*domain.Building
	err       error
}

func (r *fakeBuildingReader) GetBuilding(code string) (*domain.Building, error) {
	if r.err != nil {
		return nil, r.err
	}
	b, ok := r.buildings[code]
	if !ok {
		return nil, domain.ErrNotFound
	}
	return b, nil
}

// Match the real BuildingReader interface
func (r *fakeBuildingReader) GetAllBuildingsByCampus() (map[string][]domain.BuildingSummary, error) {
	if r.err != nil {
		return nil, r.err
	}

	result := make(map[string][]domain.BuildingSummary)
	for _, b := range r.buildings {
		// For testing, just assign all buildings to a dummy campus "SGW"
		result["SGW"] = append(result["SGW"], domain.BuildingSummary{
			Code: b.Code,
			Name: b.Name,
		})
	}
	return result, nil
}

func setupHandler(fetcher *fakeDirectionsFetcher) *DirectionsHandler {
	svc := application.NewDirectionsService(fetcher)

	fp := &fakePlacesClient{
		placeID: "p1",
		hours:   domain.OpeningHours{"monday": {Open: "08:00", Close: "18:00"}},
	}

	buildingReader := &fakeBuildingReader{
		buildings: map[string]*domain.Building{
			"B":  {Code: "B", Latitude: 45.497856, Longitude: -73.579588, Name: "Building B"},
			"VL": {Code: "VL", Latitude: 45.459026, Longitude: -73.638606, Name: "VL Building"},
			"EV": {Code: "EV", Latitude: 45.0, Longitude: -73.0, Name: "EV Building"},
			"H":  {Code: "H", Latitude: 45.1, Longitude: -73.1, Name: "H Building"},
		},
	}

	bSvc := application.NewBuildingService(buildingReader, fp)

	return NewDirectionsHandler(svc, bSvc)
}

func TestInvalidEndLat(t *testing.T) {
	gin.SetMode(gin.TestMode)
	h := setupHandler(&fakeDirectionsFetcher{})
	r := gin.New()
	r.GET("/directions", h.GetDirections)

	req := httptest.NewRequest("GET",
		"/directions?start_lat=1&start_lng=2&end_lat=abc&end_lng=4",
		nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, 400, w.Code)
	assert.Contains(t, w.Body.String(), "invalid end_lat")
}

func TestInvalidEndLng(t *testing.T) {
	gin.SetMode(gin.TestMode)
	h := setupHandler(&fakeDirectionsFetcher{})
	r := gin.New()
	r.GET("/directions", h.GetDirections)

	req := httptest.NewRequest("GET",
		"/directions?start_lat=1&start_lng=2&end_lat=3&end_lng=abc",
		nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, 400, w.Code)
	assert.Contains(t, w.Body.String(), "invalid end_lng")
}

func TestManualShuttle_Success(t *testing.T) {
	gin.SetMode(gin.TestMode)

	fetcher := &fakeDirectionsFetcher{
		resp: domain.DirectionsResponse{
			Mode:  "shuttle",
			Steps: []domain.DirectionStep{{Instruction: "Manual Shuttle"}},
		},
	}

	h := setupHandler(fetcher)
	r := gin.New()
	r.GET("/directions", h.GetDirections)

	req := httptest.NewRequest("GET",
		"/directions?start_lat=1&start_lng=2&end_lat=3&end_lng=4&mode=shuttle&shuttle_day=monday&shuttle_time=09:15",
		nil)

	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, 200, w.Code)
}

func TestManualShuttle_MissingTime(t *testing.T) {
	gin.SetMode(gin.TestMode)
	h := setupHandler(&fakeDirectionsFetcher{})
	r := gin.New()
	r.GET("/directions", h.GetDirections)

	req := httptest.NewRequest("GET",
		"/directions?start_lat=1&start_lng=2&end_lat=3&end_lng=4&mode=shuttle&shuttle_day=monday",
		nil)

	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, 400, w.Code)
}

func TestManualShuttle_InvalidMode(t *testing.T) {
	gin.SetMode(gin.TestMode)
	h := setupHandler(&fakeDirectionsFetcher{})
	r := gin.New()
	r.GET("/directions", h.GetDirections)

	req := httptest.NewRequest("GET",
		"/directions?start_lat=1&start_lng=2&end_lat=3&end_lng=4&mode=walking&shuttle_day=monday&shuttle_time=09:15",
		nil)

	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, 400, w.Code)
}

func TestManualShuttle_ConflictWithAutoParams(t *testing.T) {
	gin.SetMode(gin.TestMode)
	h := setupHandler(&fakeDirectionsFetcher{})
	r := gin.New()
	r.GET("/directions", h.GetDirections)

	req := httptest.NewRequest("GET",
		"/directions?start_lat=1&start_lng=2&end_lat=3&end_lng=4&mode=shuttle&day=monday&shuttle_day=monday&shuttle_time=09:15",
		nil)

	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, 400, w.Code)
}

func TestWriteDirectionsError_Internal500(t *testing.T) {
	gin.SetMode(gin.TestMode)

	fetcher := &fakeDirectionsFetcher{
		err: errors.New("unexpected failure"),
	}

	h := setupHandler(fetcher)
	r := gin.New()
	r.GET("/directions", h.GetDirections)

	req := httptest.NewRequest("GET",
		"/directions?start_lat=1&start_lng=2&end_lat=3&end_lng=4",
		nil)

	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, 500, w.Code)
}

func TestWriteDirectionsError_ShuttleSpecialCase(t *testing.T) {
	gin.SetMode(gin.TestMode)

	// Automatic shuttle: no ShuttleScheduleProvider injected
	fetcher := &fakeDirectionsFetcher{
		resp: domain.DirectionsResponse{
			Mode:  "walking",
			Steps: []domain.DirectionStep{{Instruction: "Walk segment", Distance: "0.2 km", Duration: "2 mins"}},
		},
	}

	h := setupHandler(fetcher)
	r := gin.New()
	r.GET("/directions", h.GetDirections)

	req := httptest.NewRequest("GET",
		"/directions?start_lat=1&start_lng=2&end_lat=3&end_lng=4&mode=shuttle",
		nil)

	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, 200, w.Code)

	// Should include shuttle mode in the response
	assert.Contains(t, w.Body.String(), "\"mode\":\"shuttle\"")

	// Should include the fallback shuttle step instruction
	assert.Contains(t, w.Body.String(), "Take the Concordia Shuttle Bus from SGW to LOY")
}

func TestInvalidStartLat(t *testing.T) {
	gin.SetMode(gin.TestMode)
	h := setupHandler(&fakeDirectionsFetcher{})
	r := gin.New()
	r.GET("/directions", h.GetDirections)

	req := httptest.NewRequest("GET",
		"/directions?start_lat=abc&start_lng=2&end_lat=3&end_lng=4",
		nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, 400, w.Code)
	assert.Contains(t, w.Body.String(), "invalid start_lat")
}

func TestInvalidStartLng(t *testing.T) {
	gin.SetMode(gin.TestMode)
	h := setupHandler(&fakeDirectionsFetcher{})
	r := gin.New()
	r.GET("/directions", h.GetDirections)

	req := httptest.NewRequest("GET",
		"/directions?start_lat=1&start_lng=abc&end_lat=3&end_lng=4",
		nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, 400, w.Code)
	assert.Contains(t, w.Body.String(), "invalid start_lng")
}

func TestInvalidMode(t *testing.T) {
	gin.SetMode(gin.TestMode)
	h := setupHandler(&fakeDirectionsFetcher{})
	r := gin.New()
	r.GET("/directions", h.GetDirections)

	req := httptest.NewRequest("GET",
		"/directions?start_lat=1&start_lng=2&end_lat=3&end_lng=4&mode=plane",
		nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, 400, w.Code)
	assert.Contains(t, w.Body.String(), "invalid mode")
}

func TestGetDirectionsByBuildings_Success(t *testing.T) {
	gin.SetMode(gin.TestMode)

	fetcher := &fakeDirectionsFetcher{
		resp: domain.DirectionsResponse{Mode: "walking"},
	}

	h := setupHandler(fetcher)
	r := gin.New()
	r.GET("/directions/buildings", h.GetDirectionsByBuildings)

	req := httptest.NewRequest("GET",
		"/directions/buildings?start_code=B&end_code=VL",
		nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, 200, w.Code)
}

func TestGetDirectionsByBuildings_InvalidStartCode(t *testing.T) {
	gin.SetMode(gin.TestMode)
	h := setupHandler(&fakeDirectionsFetcher{})
	r := gin.New()
	r.GET("/directions/buildings", h.GetDirectionsByBuildings)

	req := httptest.NewRequest("GET",
		"/directions/buildings?start_code=XXX&end_code=VL",
		nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, 400, w.Code)
}

func TestGetDirectionsByBuildings_InvalidEndCode(t *testing.T) {
	gin.SetMode(gin.TestMode)
	h := setupHandler(&fakeDirectionsFetcher{})
	r := gin.New()
	r.GET("/directions/buildings", h.GetDirectionsByBuildings)

	req := httptest.NewRequest("GET",
		"/directions/buildings?start_code=B&end_code=XXX",
		nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, 400, w.Code)
}
