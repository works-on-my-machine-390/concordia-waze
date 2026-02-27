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

type fakeRoomSearchService struct {
	Return domain.IndoorRoom
	Err    error
}

func (f *fakeRoomSearchService) FindRoom(building string, room string, floor *int) (domain.IndoorRoom, error) {
	return f.Return, f.Err
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
