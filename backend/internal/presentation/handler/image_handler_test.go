package handler

import (
	"errors"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
)

type fakeImageService struct {
	images []string
	image  []byte
	err    error
}

func (f *fakeImageService) GetBuildingImages(code string) ([]string, error) {
	return f.images, f.err
}

func (f *fakeImageService) LoadImage(baseDir, relPath string) ([]byte, string, error) {
	// return configured image bytes, proper content-type and any error
	return f.image, "image/png", f.err
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

func TestGetStaticImage_OK(t *testing.T) {
	gin.SetMode(gin.TestMode)

	// possible locations for the test asset; try them until one exists
	expectedPaths := []string{
		"./resource/floormaps/MB_1.png",
		"resource/floormaps/MB_1.png",
		"backend/resource/floormaps/MB_1.png",
		"../resource/floormaps/MB_1.png",
		"../../resource/floormaps/MB_1.png",
		"../../../resource/floormaps/MB_1.png",
	}

	var expected []byte
	var err error
	for _, p := range expectedPaths {
		expected, err = os.ReadFile(p)
		if err == nil {
			break
		}
	}
	assert.NoError(t, err, "could not find test image in any expected path")

	service := &fakeImageService{
		image: expected,
	}
	handler := NewImageHandler(service)

	r := gin.New()
	r.GET("/*path", handler.GetStaticImage)

	req := httptest.NewRequest("GET", "/floormaps/MB_1.png", nil)
	w := httptest.NewRecorder()

	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	// exact content-type should be image/png for .png files
	assert.Equal(t, "image/png", w.Header().Get("Content-Type"))
	assert.Equal(t, expected, w.Body.Bytes())
}

func TestGetStaticImage_NotFound(t *testing.T) {
	gin.SetMode(gin.TestMode)

	// configure service to return an error
	service := &fakeImageService{err: errors.New("not found")}
	handler := NewImageHandler(service)

	r := gin.New()
	r.GET("/*path", handler.GetStaticImage)

	req := httptest.NewRequest("GET", "/floormaps/does_not_exist.png", nil)
	w := httptest.NewRecorder()

	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusNotFound, w.Code)
	assert.Contains(t, w.Body.String(), "not found")
}

func TestGetStaticImage_InvalidPath(t *testing.T) {
	gin.SetMode(gin.TestMode)

	// configure service to return an error for invalid path
	service := &fakeImageService{err: errors.New("invalid path")}
	handler := NewImageHandler(service)

	r := gin.New()
	r.GET("/*path", handler.GetStaticImage)

	// attempt path traversal
	req := httptest.NewRequest("GET", "/../secret.txt", nil)
	w := httptest.NewRecorder()

	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusNotFound, w.Code)
	assert.Contains(t, w.Body.String(), "invalid path")
}
