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

// fakePointService implements the application.PointOfInterestService interface for tests.
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

func TestGetNearbyPointsOfInterestBadRequest(t *testing.T) {
	gin.SetMode(gin.TestMode)

	svc := &fakePointService{}
	h := NewPointOfInterestHandler(svc)

	r := gin.New()
	r.GET("/pointofinterest", h.GetNearbyPointsOfInterest)

	// Missing required 'lng' param
	req := httptest.NewRequest(http.MethodGet, "/pointofinterest?input=coffee&lat=45.0", nil)
	w := httptest.NewRecorder()

	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
	assert.Contains(t, w.Body.String(), "Missing or invalid parameters")
}

func TestGetNearbyPointsOfInterestSuccess(t *testing.T) {
	gin.SetMode(gin.TestMode)

	expected := []domain.Building{{Code: "B1", Name: "Place 1"}}
	fake := &fakePointService{Return: expected}
	h := NewPointOfInterestHandler(fake)

	r := gin.New()
	r.GET("/pointofinterest", h.GetNearbyPointsOfInterest)

	req := httptest.NewRequest(http.MethodGet, "/pointofinterest?input=cafe&lat=45.0&lng=-73.0&max_distance=500&rank_preference=RELEVANCE", nil)
	w := httptest.NewRecorder()

	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	// decode JSON body
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

func TestGetNearbyPointsOfInterestServiceError(t *testing.T) {
	gin.SetMode(gin.TestMode)

	fake := &fakePointService{Err: errors.New("service failure")}
	h := NewPointOfInterestHandler(fake)

	r := gin.New()
	r.GET("/pointofinterest", h.GetNearbyPointsOfInterest)

	req := httptest.NewRequest(http.MethodGet, "/pointofinterest?input=park&lat=45.0&lng=-73.0", nil)
	w := httptest.NewRecorder()

	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusInternalServerError, w.Code)
	assert.Contains(t, w.Body.String(), "service failure")
	assert.True(t, fake.Called)
}
