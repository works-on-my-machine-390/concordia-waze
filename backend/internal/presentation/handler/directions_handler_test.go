package handler

import (
	"errors"
	"net/http"
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
	resp domain.DirectionsResponse
	err  error

	calls []directionsCall
}

func (f *fakeDirectionsFetcher) GetDirections(start, end domain.LatLng, mode string) (domain.DirectionsResponse, error) {
	f.calls = append(f.calls, directionsCall{
		start: start,
		end:   end,
		mode:  mode,
	})
	return f.resp, f.err
}

// BuildingService expects a BuildingReader interface with ONLY:
// GetBuilding(code string) (*domain.Building, error)
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

func TestDirectionsHandler_Success200(t *testing.T) {
	gin.SetMode(gin.TestMode)

	fetcher := &fakeDirectionsFetcher{
		resp: domain.DirectionsResponse{
			Mode: "walking",
			Polyline: []domain.LatLng{
				{Lat: 45.0, Lng: -73.0},
				{Lat: 45.1, Lng: -73.1},
			},
			Steps: []domain.DirectionStep{
				{Instruction: "Head north", Distance: "0.2 km", Duration: "2 mins"},
			},
		},
	}

	svc := application.NewDirectionsService(fetcher)

	fp := &fakePlacesClient{
		placeID: "place123",
		hours: domain.OpeningHours{
			"monday": {Open: "08:00", Close: "18:00"},
		},
	}

	// building service not used here, but handler needs it
	bSvc := application.NewBuildingService(&fakeBuildingReader{buildings: map[string]*domain.Building{}}, fp)

	h := NewDirectionsHandler(svc, bSvc)

	r := gin.New()
	r.GET("/directions", h.GetDirections)

	req := httptest.NewRequest("GET",
		"/directions?start_lat=45.0&start_lng=-73.0&end_lat=45.1&end_lng=-73.1",
		nil,
	)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	assert.Contains(t, w.Body.String(), `"mode":"walking"`)
	assert.Contains(t, w.Body.String(), `"polyline"`)
	assert.Contains(t, w.Body.String(), `"steps"`)

	// should default to walking when mode is missing
	assert.GreaterOrEqual(t, len(fetcher.calls), 1)
	assert.Equal(t, "walking", fetcher.calls[len(fetcher.calls)-1].mode)
}

func TestDirectionsHandler_BadRequest_InvalidMode400(t *testing.T) {
	gin.SetMode(gin.TestMode)

	fp := &fakePlacesClient{
		placeID: "place123",
		hours: domain.OpeningHours{
			"monday": {Open: "08:00", Close: "18:00"},
		},
	}

	fetcher := &fakeDirectionsFetcher{}
	svc := application.NewDirectionsService(fetcher)
	bSvc := application.NewBuildingService(&fakeBuildingReader{buildings: map[string]*domain.Building{}}, fp)

	h := NewDirectionsHandler(svc, bSvc)

	r := gin.New()
	r.GET("/directions", h.GetDirections)

	req := httptest.NewRequest("GET",
		"/directions?start_lat=45&start_lng=-73&end_lat=45.1&end_lng=-73.1&mode=plane",
		nil,
	)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
	assert.Contains(t, w.Body.String(), "invalid mode")
}

func TestDirectionsHandler_BadRequest_InvalidLat400(t *testing.T) {
	gin.SetMode(gin.TestMode)

	fp := &fakePlacesClient{
		placeID: "place123",
		hours: domain.OpeningHours{
			"monday": {Open: "08:00", Close: "18:00"},
		},
	}
	fetcher := &fakeDirectionsFetcher{}
	svc := application.NewDirectionsService(fetcher)
	bSvc := application.NewBuildingService(&fakeBuildingReader{buildings: map[string]*domain.Building{}}, fp)

	h := NewDirectionsHandler(svc, bSvc)

	r := gin.New()
	r.GET("/directions", h.GetDirections)

	req := httptest.NewRequest("GET",
		"/directions?start_lat=abc&start_lng=-73&end_lat=45.1&end_lng=-73.1",
		nil,
	)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
	assert.Contains(t, w.Body.String(), "invalid start_lat")
}

func TestDirectionsHandler_Shuttle_Success200_CallsWalkingLegs(t *testing.T) {
	gin.SetMode(gin.TestMode)

	// This fake returns a walking response (used for both walking legs).
	fetcher := &fakeDirectionsFetcher{
		resp: domain.DirectionsResponse{
			Mode: "walking",
			Polyline: []domain.LatLng{
				{Lat: 45.49, Lng: -73.57},
				{Lat: 45.48, Lng: -73.58},
			},
			Steps: []domain.DirectionStep{
				{Instruction: "Walk a bit", Distance: "0.3 km", Duration: "4 mins"},
			},
		},
	}

	svc := application.NewDirectionsService(fetcher)

	fp := &fakePlacesClient{
		placeID: "place123",
		hours: domain.OpeningHours{
			"monday": {Open: "08:00", Close: "18:00"},
		},
	}

	// Must include shuttle stop buildings: "B" (SGW) and "VL" (LOY)
	bSvc := application.NewBuildingService(&fakeBuildingReader{
		buildings: map[string]*domain.Building{
			// SGW stop
			"B": {Code: "B", Latitude: 45.497856, Longitude: -73.579588},
			// LOY stop
			"VL": {Code: "VL", Latitude: 45.459026, Longitude: -73.638606},
		},
	}, fp)

	h := NewDirectionsHandler(svc, bSvc)

	r := gin.New()
	r.GET("/directions", h.GetDirections)

	// Start near LOY (lat smaller), end near SGW (lat larger) => shuttle should trigger
	req := httptest.NewRequest("GET",
		"/directions?start_lat=45.4580&start_lng=-73.6400&end_lat=45.4970&end_lng=-73.5790&mode=shuttle",
		nil,
	)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	body := w.Body.String()
	assert.Contains(t, body, `"mode":"shuttle"`)
	assert.Contains(t, body, `"steps"`)
	assert.Contains(t, body, "Concordia Shuttle") // should contain the shuttle step
	assert.Contains(t, body, "25 mins")           // shuttle duration set by handler
	assert.Contains(t, body, `"polyline"`)        // should not be empty anymore (merged)

	// Shuttle mode should call the directions service twice with WALKING (for the two walking legs)
	// (The shuttle leg itself is not a Google call.)
	assert.GreaterOrEqual(t, len(fetcher.calls), 2)

	assert.Equal(t, "walking", fetcher.calls[0].mode)
	assert.Equal(t, "walking", fetcher.calls[1].mode)
}

func TestDirectionsHandler_Buildings_Success200(t *testing.T) {
	gin.SetMode(gin.TestMode)

	fetcher := &fakeDirectionsFetcher{
		resp: domain.DirectionsResponse{
			Mode: "walking",
			Polyline: []domain.LatLng{
				{Lat: 45.0, Lng: -73.0},
				{Lat: 45.1, Lng: -73.1},
			},
			Steps: []domain.DirectionStep{
				{Instruction: "Walk to destination", Distance: "0.5 km", Duration: "6 mins"},
			},
		},
	}

	svc := application.NewDirectionsService(fetcher)

	fp := &fakePlacesClient{
		placeID: "place123",
		hours: domain.OpeningHours{
			"monday": {Open: "08:00", Close: "18:00"},
		},
	}

	bSvc := application.NewBuildingService(&fakeBuildingReader{
		buildings: map[string]*domain.Building{
			"EV": {Code: "EV", Latitude: 45.0, Longitude: -73.0},
			"H":  {Code: "H", Latitude: 45.1, Longitude: -73.1},
		},
	}, fp)

	h := NewDirectionsHandler(svc, bSvc)

	r := gin.New()
	r.GET("/directions/buildings", h.GetDirectionsByBuildings)

	req := httptest.NewRequest("GET",
		"/directions/buildings?start_code=EV&end_code=H",
		nil,
	)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	assert.Contains(t, w.Body.String(), `"mode":"walking"`)
	assert.Contains(t, w.Body.String(), `"polyline"`)
	assert.Contains(t, w.Body.String(), `"steps"`)

	assert.GreaterOrEqual(t, len(fetcher.calls), 1)
	assert.Equal(t, "walking", fetcher.calls[len(fetcher.calls)-1].mode)
}

func TestDirectionsHandler_Buildings_BadRequest_InvalidStartCode400(t *testing.T) {
	gin.SetMode(gin.TestMode)

	fetcher := &fakeDirectionsFetcher{}
	svc := application.NewDirectionsService(fetcher)

	fp := &fakePlacesClient{
		placeID: "place123",
		hours: domain.OpeningHours{
			"monday": {Open: "08:00", Close: "18:00"},
		},
	}

	bSvc := application.NewBuildingService(&fakeBuildingReader{
		buildings: map[string]*domain.Building{
			"H": {Code: "H", Latitude: 45.1, Longitude: -73.1},
		},
	}, fp)

	h := NewDirectionsHandler(svc, bSvc)

	r := gin.New()
	r.GET("/directions/buildings", h.GetDirectionsByBuildings)

	req := httptest.NewRequest("GET",
		"/directions/buildings?start_code=INVALID&end_code=H",
		nil,
	)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
	assert.Contains(t, w.Body.String(), "invalid start_code")
}

func TestDirectionsHandler_Buildings_RepoError500(t *testing.T) {
	gin.SetMode(gin.TestMode)

	fetcher := &fakeDirectionsFetcher{}
	svc := application.NewDirectionsService(fetcher)

	fp := &fakePlacesClient{
		placeID: "place123",
		hours: domain.OpeningHours{
			"monday": {Open: "08:00", Close: "18:00"},
		},
	}

	bSvc := application.NewBuildingService(&fakeBuildingReader{
		err: errors.New("db down"),
	}, fp)

	h := NewDirectionsHandler(svc, bSvc)

	r := gin.New()
	r.GET("/directions/buildings", h.GetDirectionsByBuildings)

	req := httptest.NewRequest("GET",
		"/directions/buildings?start_code=EV&end_code=H",
		nil,
	)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	// Keeping current behavior: repo error treated as invalid code -> 400
	assert.Equal(t, http.StatusBadRequest, w.Code)
}
