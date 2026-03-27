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

type fakeRoomLookupService struct {
	ret application.RoomLookupResult
	err error
}

func (f *fakeRoomLookupService) LookupRoomOrBuilding(building string, room string) (application.RoomLookupResult, error) {
	return f.ret, f.err
}

func TestRoomLookupHandler_BadRequest(t *testing.T) {
	gin.SetMode(gin.TestMode)
	h := NewRoomLookupHandler(&fakeRoomLookupService{})

	r := gin.New()
	r.GET("/rooms/lookup", h.LookupRoom)

	req := httptest.NewRequest(http.MethodGet, "/rooms/lookup?building=MB", nil)
	w := httptest.NewRecorder()

	r.ServeHTTP(w, req)
	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestRoomLookupHandler_SuccessRoomFound(t *testing.T) {
	gin.SetMode(gin.TestMode)

	h := NewRoomLookupHandler(&fakeRoomLookupService{ret: application.RoomLookupResult{
		Room:            &domain.IndoorRoom{Room: "MB-101", Building: "MB", Floor: 1, Centroid: domain.IndoorPosition{X: 10, Y: 20}},
		BuildingCode:    "MB",
		FallbackToBuild: false,
	}})

	r := gin.New()
	r.GET("/rooms/lookup", h.LookupRoom)

	req := httptest.NewRequest(http.MethodGet, "/rooms/lookup?building=MB&room=MB-101", nil)
	w := httptest.NewRecorder()

	r.ServeHTTP(w, req)
	assert.Equal(t, http.StatusOK, w.Code)

	var resp struct {
		Data application.RoomLookupResult `json:"data"`
	}
	assert.NoError(t, json.Unmarshal(w.Body.Bytes(), &resp))
	if assert.NotNil(t, resp.Data.Room) {
		assert.Equal(t, "MB-101", resp.Data.Room.Room)
		assert.Equal(t, 10.0, resp.Data.Room.Centroid.X)
		assert.Equal(t, 20.0, resp.Data.Room.Centroid.Y)
	}
}

func TestRoomLookupHandler_SuccessFallbackToBuilding(t *testing.T) {
	gin.SetMode(gin.TestMode)

	h := NewRoomLookupHandler(&fakeRoomLookupService{ret: application.RoomLookupResult{
		BuildingCode:    "MB",
		BuildingLat:     45.4971,
		BuildingLng:     -73.5790,
		FallbackToBuild: true,
		Reason:          "room_not_found",
	}})

	r := gin.New()
	r.GET("/rooms/lookup", h.LookupRoom)

	req := httptest.NewRequest(http.MethodGet, "/rooms/lookup?building=MB&room=MB-999", nil)
	w := httptest.NewRecorder()

	r.ServeHTTP(w, req)
	assert.Equal(t, http.StatusOK, w.Code)
	assert.Contains(t, w.Body.String(), "room_not_found")
	assert.Contains(t, w.Body.String(), "45.4971")
	assert.Contains(t, w.Body.String(), "-73.579")
}

func TestRoomLookupHandler_BuildingNotFound(t *testing.T) {
	gin.SetMode(gin.TestMode)
	h := NewRoomLookupHandler(&fakeRoomLookupService{err: domain.ErrNotFound})

	r := gin.New()
	r.GET("/rooms/lookup", h.LookupRoom)

	req := httptest.NewRequest(http.MethodGet, "/rooms/lookup?building=BAD&room=MB-101", nil)
	w := httptest.NewRecorder()

	r.ServeHTTP(w, req)
	assert.Equal(t, http.StatusNotFound, w.Code)
	assert.Contains(t, w.Body.String(), "building not found")
}

func TestRoomLookupHandler_InternalServerError(t *testing.T) {
	gin.SetMode(gin.TestMode)
	h := NewRoomLookupHandler(&fakeRoomLookupService{err: errors.New("db down")})

	r := gin.New()
	r.GET("/rooms/lookup", h.LookupRoom)

	req := httptest.NewRequest(http.MethodGet, "/rooms/lookup?building=MB&room=MB-101", nil)
	w := httptest.NewRecorder()

	r.ServeHTTP(w, req)
	assert.Equal(t, http.StatusInternalServerError, w.Code)
	assert.Contains(t, w.Body.String(), "db down")
}
