package handler

import (
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/works-on-my-machine-390/concordia-waze/internal/domain"
)

// -----------------------------
// Fakes
// -----------------------------

// fakePointService implements application.PointOfInterestGetter for tests.
type fakePointService struct {
	Called         bool
	Input          string
	Lat            float64
	Lng            float64
	MaxDistance    int
	RankPreference string

	Return []domain.Building
	Err    error
}

func (f *fakePointService) GetNearbyPointsOfInterest(input string, lat, lng float64, maxDistanceInMeters int, rankPreference string) ([]domain.Building, error) {
	f.Called = true
	f.Input = input
	f.Lat = lat
	f.Lng = lng
	f.MaxDistance = maxDistanceInMeters
	f.RankPreference = rankPreference
	return f.Return, f.Err
}

// fakeIndoorPOIService implements application.IndoorPointOfInterestGetter for tests.
type fakeIndoorPOIService struct {
	Called    bool
	Building  string
	Floor     int
	X         float64
	Y         float64
	Radius    int
	SameFloor bool
	Limit     int

	Return []domain.IndoorPOI
	Err    error
}

func (f *fakeIndoorPOIService) GetNearbyIndoorPOIs(building string, floor int, x, y float64, radiusMeters int, sameFloor bool, limit int) ([]domain.IndoorPOI, error) {
	f.Called = true
	f.Building = building
	f.Floor = floor
	f.X = x
	f.Y = y
	f.Radius = radiusMeters
	f.SameFloor = sameFloor
	f.Limit = limit
	return f.Return, f.Err
}

// helper to build handler with both deps
func newHandlerWithFakes(p *fakePointService, indoor *fakeIndoorPOIService) *PointOfInterestHandler {
	if p == nil {
		p = &fakePointService{}
	}
	if indoor == nil {
		indoor = &fakeIndoorPOIService{}
	}
	return NewPointOfInterestHandler(p, indoor)
}

// -----------------------------
// Tests: Google Places POIs
// -----------------------------

func TestGetNearbyPointsOfInterest_BadRequest(t *testing.T) {
	gin.SetMode(gin.TestMode)

	svc := &fakePointService{}
	indoor := &fakeIndoorPOIService{}
	h := NewPointOfInterestHandler(svc, indoor)

	r := gin.New()
	r.GET("/pointofinterest", h.GetNearbyPointsOfInterest)

	// Missing required 'lng' param
	req := httptest.NewRequest(http.MethodGet, "/pointofinterest?input=coffee&lat=45.0", nil)
	w := httptest.NewRecorder()

	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
	assert.Contains(t, w.Body.String(), "Missing or invalid parameters")
}

func TestGetNearbyPointsOfInterest_Success(t *testing.T) {
	gin.SetMode(gin.TestMode)

	expected := []domain.Building{{Code: "B1", Name: "Place 1"}}
	fake := &fakePointService{Return: expected}
	h := newHandlerWithFakes(fake, &fakeIndoorPOIService{})

	r := gin.New()
	r.GET("/pointofinterest", h.GetNearbyPointsOfInterest)

	req := httptest.NewRequest(http.MethodGet, "/pointofinterest?input=cafe&lat=45.0&lng=-73.0&max_distance=500&rank_preference=RELEVANCE", nil)
	w := httptest.NewRecorder()

	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var resp struct {
		Data []domain.Building `json:"data"`
	}
	err := json.Unmarshal(w.Body.Bytes(), &resp)
	assert.NoError(t, err)
	assert.Equal(t, expected, resp.Data)

	assert.True(t, fake.Called)
	assert.Equal(t, "cafe", fake.Input)
	assert.Equal(t, 45.0, fake.Lat)
	assert.Equal(t, -73.0, fake.Lng)
	assert.Equal(t, 500, fake.MaxDistance)
	assert.Equal(t, "RELEVANCE", fake.RankPreference)
}

func TestGetNearbyPointsOfInterest_ServiceError(t *testing.T) {
	gin.SetMode(gin.TestMode)

	fake := &fakePointService{Err: errors.New("service failure")}
	h := newHandlerWithFakes(fake, &fakeIndoorPOIService{})

	r := gin.New()
	r.GET("/pointofinterest", h.GetNearbyPointsOfInterest)

	req := httptest.NewRequest(http.MethodGet, "/pointofinterest?input=park&lat=45.0&lng=-73.0", nil)
	w := httptest.NewRecorder()

	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusInternalServerError, w.Code)
	assert.Contains(t, w.Body.String(), "service failure")
	assert.True(t, fake.Called)
}

// -----------------------------
// Tests: Indoor POIs
// -----------------------------

func TestGetNearbyIndoorPOIs_BadRequest(t *testing.T) {
	gin.SetMode(gin.TestMode)

	h := newHandlerWithFakes(&fakePointService{}, &fakeIndoorPOIService{})

	r := gin.New()
	r.GET("/pointofinterest/indoor", h.GetNearbyIndoorPOIs)

	// Missing required params (needs building, floor, x, y)
	req := httptest.NewRequest(http.MethodGet, "/pointofinterest/indoor?building=MB&floor=0&x=1.0", nil)
	w := httptest.NewRecorder()

	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
	assert.Contains(t, w.Body.String(), "Missing or invalid parameters")
}

func TestGetNearbyIndoorPOIs_Success(t *testing.T) {
	gin.SetMode(gin.TestMode)

	expected := []domain.IndoorPOI{
		{
			ID:       1,
			Building: "MB",
			Floor:    0,
			Type:     "stairs",
			Position: domain.IndoorPosition{X: -397064.9, Y: 180728.4},
		},
	}

	indoorFake := &fakeIndoorPOIService{Return: expected}
	h := newHandlerWithFakes(&fakePointService{}, indoorFake)

	r := gin.New()
	r.GET("/pointofinterest/indoor", h.GetNearbyIndoorPOIs)

	req := httptest.NewRequest(http.MethodGet,
		"/pointofinterest/indoor?building=MB&floor=0&x=-397068.6&y=180703.1&radius=50&sameFloor=true&limit=10",
		nil,
	)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var resp struct {
		Data []domain.IndoorPOI `json:"data"`
	}
	err := json.Unmarshal(w.Body.Bytes(), &resp)
	assert.NoError(t, err)
	assert.Equal(t, expected, resp.Data)

	assert.True(t, indoorFake.Called)
	assert.Equal(t, "MB", indoorFake.Building)
	assert.Equal(t, 0, indoorFake.Floor)
	assert.Equal(t, -397068.6, indoorFake.X)
	assert.Equal(t, 180703.1, indoorFake.Y)
	assert.Equal(t, 50, indoorFake.Radius)
	assert.Equal(t, true, indoorFake.SameFloor)
	assert.Equal(t, 10, indoorFake.Limit)
}

func TestGetNearbyIndoorPOIs_ServiceError(t *testing.T) {
	gin.SetMode(gin.TestMode)

	indoorFake := &fakeIndoorPOIService{Err: errors.New("indoor service failure")}
	h := newHandlerWithFakes(&fakePointService{}, indoorFake)

	r := gin.New()
	r.GET("/pointofinterest/indoor", h.GetNearbyIndoorPOIs)

	req := httptest.NewRequest(http.MethodGet,
		"/pointofinterest/indoor?building=MB&floor=0&x=1&y=2",
		nil,
	)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusInternalServerError, w.Code)
	assert.Contains(t, w.Body.String(), "indoor service failure")
	assert.True(t, indoorFake.Called)
}
