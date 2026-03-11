package handler_test

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/works-on-my-machine-390/concordia-waze/internal/application"
	"github.com/works-on-my-machine-390/concordia-waze/internal/domain"
	"github.com/works-on-my-machine-390/concordia-waze/internal/persistence/repository"
	"github.com/works-on-my-machine-390/concordia-waze/internal/presentation/handler"
)

func setupFavoritesTest(t *testing.T) (*handler.FavoritesHandler, *gin.Engine) {
	t.Helper()
	repo := repository.NewInMemoryFavoriteRepository()
	service := application.NewFavoritesService(repo)
	favHandler := handler.NewFavoritesHandler(service)

	router := gin.New()
	favGroup := router.Group("/favorites")
	{
		favGroup.POST("", favHandler.CreateFavorite)
		favGroup.GET("", favHandler.GetFavorites)
		favGroup.DELETE("/:id", favHandler.DeleteFavorite)
	}

	return favHandler, router
}

func TestCreateFavoriteSuccess(t *testing.T) {
	gin.SetMode(gin.TestMode)
	_, router := setupFavoritesTest(t)

	reqBody := handler.CreateFavoriteRequest{
		UserID:    "device-uuid-1",
		Name:      "Home",
		Latitude:  45.4971,
		Longitude: -73.5789,
	}
	body, _ := json.Marshal(reqBody)
	req := httptest.NewRequest(http.MethodPost, "/favorites", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	if w.Code != http.StatusCreated {
		t.Errorf("Expected status %d, got %d: %s", http.StatusCreated, w.Code, w.Body.String())
	}

	var fav domain.Favorite
	json.Unmarshal(w.Body.Bytes(), &fav)
	if fav.ID == "" {
		t.Fatal("Expected favorite ID in response")
	}
	if fav.Name != "Home" {
		t.Errorf("Expected name 'Home', got %s", fav.Name)
	}
	if fav.UserID != "device-uuid-1" {
		t.Errorf("Expected userID 'device-uuid-1', got %s", fav.UserID)
	}
}

func TestCreateFavoriteInvalidBody(t *testing.T) {
	gin.SetMode(gin.TestMode)
	_, router := setupFavoritesTest(t)

	// Malformed JSON
	req := httptest.NewRequest(http.MethodPost, "/favorites", bytes.NewBufferString("{"))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("Expected status %d, got %d", http.StatusBadRequest, w.Code)
	}
}

func TestCreateFavoriteMissingName(t *testing.T) {
	gin.SetMode(gin.TestMode)
	_, router := setupFavoritesTest(t)

	// Missing required name field
	body, _ := json.Marshal(map[string]interface{}{"userId": "device-uuid-1", "latitude": 45.4971})
	req := httptest.NewRequest(http.MethodPost, "/favorites", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("Expected status %d, got %d", http.StatusBadRequest, w.Code)
	}
}

func TestGetFavoritesSuccess(t *testing.T) {
	gin.SetMode(gin.TestMode)
	_, router := setupFavoritesTest(t)

	// Create a favorite for device-uuid-1
	createReq := handler.CreateFavoriteRequest{
		UserID: "device-uuid-1", Name: "Home", Latitude: 45.4971, Longitude: -73.5789,
	}
	body, _ := json.Marshal(createReq)
	req := httptest.NewRequest(http.MethodPost, "/favorites", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusCreated {
		t.Fatalf("Setup: create favorite failed with status %d", w.Code)
	}

	// List favorites scoped to device-uuid-1
	req = httptest.NewRequest(http.MethodGet, "/favorites?userId=device-uuid-1", nil)
	w = httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status %d, got %d", http.StatusOK, w.Code)
	}

	var favorites []domain.Favorite
	json.Unmarshal(w.Body.Bytes(), &favorites)
	if len(favorites) != 1 {
		t.Errorf("Expected 1 favorite, got %d", len(favorites))
	}
}

func TestGetFavoritesEmptyList(t *testing.T) {
	gin.SetMode(gin.TestMode)
	_, router := setupFavoritesTest(t)

	req := httptest.NewRequest(http.MethodGet, "/favorites?userId=device-uuid-1", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status %d, got %d", http.StatusOK, w.Code)
	}

	var favorites []domain.Favorite
	json.Unmarshal(w.Body.Bytes(), &favorites)
	if len(favorites) != 0 {
		t.Errorf("Expected 0 favorites, got %d", len(favorites))
	}
}

func TestGetFavoritesIsolatedByUserID(t *testing.T) {
	gin.SetMode(gin.TestMode)
	_, router := setupFavoritesTest(t)

	// Create a favorite for device-uuid-1
	body, _ := json.Marshal(handler.CreateFavoriteRequest{
		UserID: "device-uuid-1", Name: "Home", Latitude: 45.4971, Longitude: -73.5789,
	})
	req := httptest.NewRequest(http.MethodPost, "/favorites", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	// device-uuid-2 should see an empty list
	req = httptest.NewRequest(http.MethodGet, "/favorites?userId=device-uuid-2", nil)
	w = httptest.NewRecorder()
	router.ServeHTTP(w, req)

	var favorites []domain.Favorite
	json.Unmarshal(w.Body.Bytes(), &favorites)
	if len(favorites) != 0 {
		t.Errorf("Expected 0 favorites for device-uuid-2, got %d", len(favorites))
	}
}

func TestDeleteFavoriteSuccess(t *testing.T) {
	gin.SetMode(gin.TestMode)
	_, router := setupFavoritesTest(t)

	// Create a favorite
	createReq := handler.CreateFavoriteRequest{
		UserID: "device-uuid-1", Name: "Home", Latitude: 45.4971, Longitude: -73.5789,
	}
	body, _ := json.Marshal(createReq)
	req := httptest.NewRequest(http.MethodPost, "/favorites", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	var created domain.Favorite
	json.Unmarshal(w.Body.Bytes(), &created)

	// Delete it
	req = httptest.NewRequest(http.MethodDelete, "/favorites/"+created.ID, nil)
	w = httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status %d, got %d: %s", http.StatusOK, w.Code, w.Body.String())
	}
}

func TestDeleteFavoriteNotFound(t *testing.T) {
	gin.SetMode(gin.TestMode)
	_, router := setupFavoritesTest(t)

	req := httptest.NewRequest(http.MethodDelete, "/favorites/nonexistent-id", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusNotFound {
		t.Errorf("Expected status %d, got %d", http.StatusNotFound, w.Code)
	}
}
