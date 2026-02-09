package handler

import (
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
)

type fakeImageService struct {
	images []string
	err    error
}

func (f *fakeImageService) GetBuildingImages(code string) ([]string, error) {
	return f.images, f.err
}

func TestGetBuildingImages_OK(t *testing.T) {
	gin.SetMode(gin.TestMode)

	service := &fakeImageService{
		images: []string{"img1", "img2"},
	}

	handler := NewImageHandler(service)

	r := gin.New()
	r.GET("/buildings/:code/images", handler.GetBuildingImages)

	req := httptest.NewRequest("GET", "/buildings/LS/images", nil)
	w := httptest.NewRecorder()

	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	assert.Contains(t, w.Body.String(), "img1")
}

func TestGetBuildingImages_Error(t *testing.T) {
	gin.SetMode(gin.TestMode)

	service := &fakeImageService{
		err: errors.New("not found"),
	}

	handler := NewImageHandler(service)

	r := gin.New()
	r.GET("/buildings/:code/images", handler.GetBuildingImages)

	req := httptest.NewRequest("GET", "/buildings/LS/images", nil)
	w := httptest.NewRecorder()

	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusNotFound, w.Code)
}
