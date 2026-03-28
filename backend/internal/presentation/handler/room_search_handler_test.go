package handler

import (
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/works-on-my-machine-390/concordia-waze/internal/application"
	"github.com/works-on-my-machine-390/concordia-waze/internal/domain"
)

type fakeRoomSearchService struct {
	Return     domain.IndoorRoom
	Err        error
	ReturnSafe application.RoomSearchResult
	ErrSafe    error
}

func (f *fakeRoomSearchService) FindRoom(building string, room string, floor *int) (domain.IndoorRoom, error) {
	return f.Return, f.Err
}

func (f *fakeRoomSearchService) FindRoomOrDefaultToBuilding(building string, room string) (application.RoomSearchResult, error) {
	return f.ReturnSafe, f.ErrSafe
}

func TestRoomSearchHandler_BadRequest(t *testing.T) {
	gin.SetMode(gin.TestMode)
	h := NewRoomSearchHandler(&fakeRoomSearchService{})

	r := gin.New()
	r.GET("/rooms/search", h.SearchRoom)

	req := httptest.NewRequest(http.MethodGet, "/rooms/search?building=MB", nil) // missing room
	w := httptest.NewRecorder()

	r.ServeHTTP(w, req)
	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestRoomSearchHandler_NotFound(t *testing.T) {
	gin.SetMode(gin.TestMode)
	h := NewRoomSearchHandler(&fakeRoomSearchService{Err: errors.New("room not found")})

	r := gin.New()
	r.GET("/rooms/search", h.SearchRoom)

	req := httptest.NewRequest(http.MethodGet, "/rooms/search?building=MB&room=MB-999", nil)
	w := httptest.NewRecorder()

	r.ServeHTTP(w, req)
	assert.Equal(t, http.StatusNotFound, w.Code)
}

func TestRoomSearchHandler_Success(t *testing.T) {
	gin.SetMode(gin.TestMode)

	expected := domain.IndoorRoom{
		Room:     "MB-101",
		Building: "MB",
		Floor:    0,
		Centroid: domain.IndoorPosition{X: 1, Y: 2},
	}

	h := NewRoomSearchHandler(&fakeRoomSearchService{Return: expected})

	r := gin.New()
	r.GET("/rooms/search", h.SearchRoom)

	req := httptest.NewRequest(http.MethodGet, "/rooms/search?building=MB&room=MB-101&floor=0", nil)
	w := httptest.NewRecorder()

	r.ServeHTTP(w, req)
	assert.Equal(t, http.StatusOK, w.Code)

	var resp struct {
		Data domain.IndoorRoom `json:"data"`
	}
	assert.NoError(t, json.Unmarshal(w.Body.Bytes(), &resp))
	assert.Equal(t, expected, resp.Data)
}

func TestRoomSearchHandler_InternalServerError(t *testing.T) {
	gin.SetMode(gin.TestMode)

	h := NewRoomSearchHandler(&fakeRoomSearchService{Err: errors.New("db down")})

	r := gin.New()
	r.GET("/rooms/search", h.SearchRoom)

	req := httptest.NewRequest(http.MethodGet, "/rooms/search?building=MB&room=S2.285", nil)
	w := httptest.NewRecorder()

	r.ServeHTTP(w, req)
	assert.Equal(t, http.StatusInternalServerError, w.Code)
	assert.Contains(t, w.Body.String(), "db down")
}

func TestRoomSearchHandler_SafeSearch_BadRequest(t *testing.T) {
	gin.SetMode(gin.TestMode)
	h := NewRoomSearchHandler(&fakeRoomSearchService{})

	r := gin.New()
	r.GET("/rooms/safesearch", h.FindRoomOrDefaultToBuilding)

	req := httptest.NewRequest(http.MethodGet, "/rooms/safesearch?building=MB", nil) // missing room
	w := httptest.NewRecorder()

	r.ServeHTTP(w, req)
	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestRoomSearchHandler_SafeSearch_SuccessRoomFound(t *testing.T) {
	gin.SetMode(gin.TestMode)

	expected := application.RoomSearchResult{
		Label:              "MB - S2.285",
		Room:               &domain.IndoorRoom{Room: "S2.285", Building: "MB", Floor: 0, Centroid: domain.IndoorPosition{X: 1, Y: 2}},
		BuildingCode:       "MB",
		BuildingLat:        45.5,
		BuildingLng:        -73.57,
		FallbackToBuilding: false,
	}

	h := NewRoomSearchHandler(&fakeRoomSearchService{ReturnSafe: expected})

	r := gin.New()
	r.GET("/rooms/safesearch", h.FindRoomOrDefaultToBuilding)

	req := httptest.NewRequest(http.MethodGet, "/rooms/safesearch?building=MB&room=S2.285", nil)
	w := httptest.NewRecorder()

	r.ServeHTTP(w, req)
	assert.Equal(t, http.StatusOK, w.Code)

	var resp application.RoomSearchResult
	assert.NoError(t, json.Unmarshal(w.Body.Bytes(), &resp))
	assert.Equal(t, expected.Label, resp.Label)
	assert.Equal(t, expected.BuildingCode, resp.BuildingCode)
	assert.Equal(t, expected.FallbackToBuilding, resp.FallbackToBuilding)
	if assert.NotNil(t, resp.Room) {
		assert.Equal(t, "S2.285", resp.Room.Room)
	}
}

func TestRoomSearchHandler_SafeSearch_SuccessFallback(t *testing.T) {
	gin.SetMode(gin.TestMode)

	expected := application.RoomSearchResult{
		Label:              "MB - John Molson",
		BuildingCode:       "MB",
		BuildingLat:        45.5,
		BuildingLng:        -73.57,
		FallbackToBuilding: true,
		Reason:             domain.ErrRoomNotFound.Error(),
	}

	h := NewRoomSearchHandler(&fakeRoomSearchService{ReturnSafe: expected})

	r := gin.New()
	r.GET("/rooms/safesearch", h.FindRoomOrDefaultToBuilding)

	req := httptest.NewRequest(http.MethodGet, "/rooms/safesearch?building=MB&room=S2.999", nil)
	w := httptest.NewRecorder()

	r.ServeHTTP(w, req)
	assert.Equal(t, http.StatusOK, w.Code)

	var resp application.RoomSearchResult
	assert.NoError(t, json.Unmarshal(w.Body.Bytes(), &resp))
	assert.Equal(t, expected, resp)
}

func TestRoomSearchHandler_SafeSearch_InternalServerError(t *testing.T) {
	gin.SetMode(gin.TestMode)

	h := NewRoomSearchHandler(&fakeRoomSearchService{ErrSafe: errors.New("building repo down")})

	r := gin.New()
	r.GET("/rooms/safesearch", h.FindRoomOrDefaultToBuilding)

	req := httptest.NewRequest(http.MethodGet, "/rooms/safesearch?building=MB&room=S2.285", nil)
	w := httptest.NewRecorder()

	r.ServeHTTP(w, req)
	assert.Equal(t, http.StatusInternalServerError, w.Code)
	assert.Contains(t, w.Body.String(), "building repo down")
}
