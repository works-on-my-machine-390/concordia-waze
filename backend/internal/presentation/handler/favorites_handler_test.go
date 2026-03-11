package handler_test

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/works-on-my-machine-390/concordia-waze/internal/application"
	"github.com/works-on-my-machine-390/concordia-waze/internal/domain"
	"github.com/works-on-my-machine-390/concordia-waze/internal/persistence/repository"
	"github.com/works-on-my-machine-390/concordia-waze/internal/presentation/handler"
	"github.com/works-on-my-machine-390/concordia-waze/internal/presentation/middleware"
)

func setupFavoritesTest(t *testing.T) (*handler.FavoritesHandler, *application.JWTManager, *gin.Engine) {
	t.Helper()
	repo := repository.NewInMemoryFavoriteRepository()
	service := application.NewFavoritesService(repo)
	favHandler := handler.NewFavoritesHandler(service)
	jwtManager := application.NewJWTManager("test-secret-key", 24*time.Hour)

	router := gin.New()
	// AuthMiddleware parses tokens when present, but does NOT block unauthenticated requests
	router.Use(middleware.AuthMiddleware(jwtManager))
	favGroup := router.Group("/favorites")
	{
		favGroup.POST("", favHandler.CreateFavorite)
		favGroup.GET("", favHandler.GetFavorites)
		favGroup.DELETE("/:id", favHandler.DeleteFavorite)
	}

	return favHandler, jwtManager, router
}

func makeFavoriteToken(jwtManager *application.JWTManager, userID string) string {
	user := &domain.User{ID: userID, Email: "test@concordia.ca"}
	token, _ := jwtManager.GenerateToken(user)
	return token
}

// ---- Authenticated user tests ----

func TestCreateFavoriteSuccess(t *testing.T) {
	gin.SetMode(gin.TestMode)
	_, jwtManager, router := setupFavoritesTest(t)
	token := makeFavoriteToken(jwtManager, "user-1")

	reqBody := handler.CreateFavoriteRequest{
		Name:      "Home",
		Latitude:  45.4971,
		Longitude: -73.5789,
	}
	body, _ := json.Marshal(reqBody)
	req := httptest.NewRequest(http.MethodPost, "/favorites", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+token)
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
	if fav.UserID != "user-1" {
		t.Errorf("Expected userID 'user-1', got %s", fav.UserID)
	}
}

func TestCreateFavoriteInvalidBody(t *testing.T) {
	gin.SetMode(gin.TestMode)
	_, jwtManager, router := setupFavoritesTest(t)
	token := makeFavoriteToken(jwtManager, "user-1")

	req := httptest.NewRequest(http.MethodPost, "/favorites", bytes.NewBufferString("{"))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+token)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("Expected status %d, got %d", http.StatusBadRequest, w.Code)
	}
}

func TestCreateFavoriteMissingName(t *testing.T) {
	gin.SetMode(gin.TestMode)
	_, jwtManager, router := setupFavoritesTest(t)
	token := makeFavoriteToken(jwtManager, "user-1")

	body, _ := json.Marshal(map[string]float64{"latitude": 45.4971, "longitude": -73.5789})
	req := httptest.NewRequest(http.MethodPost, "/favorites", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+token)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("Expected status %d, got %d", http.StatusBadRequest, w.Code)
	}
}

func TestGetFavoritesSuccess(t *testing.T) {
	gin.SetMode(gin.TestMode)
	_, jwtManager, router := setupFavoritesTest(t)
	token := makeFavoriteToken(jwtManager, "user-1")

	// Create a favorite
	createReq := handler.CreateFavoriteRequest{Name: "Home", Latitude: 45.4971, Longitude: -73.5789}
	body, _ := json.Marshal(createReq)
	req := httptest.NewRequest(http.MethodPost, "/favorites", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+token)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusCreated {
		t.Fatalf("Setup: create favorite failed with status %d", w.Code)
	}

	// List favorites — scoped to the authenticated user automatically
	req = httptest.NewRequest(http.MethodGet, "/favorites", nil)
	req.Header.Set("Authorization", "Bearer "+token)
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

func TestDeleteFavoriteSuccess(t *testing.T) {
	gin.SetMode(gin.TestMode)
	_, jwtManager, router := setupFavoritesTest(t)
	token := makeFavoriteToken(jwtManager, "user-1")

	// Create a favorite
	createReq := handler.CreateFavoriteRequest{Name: "Home", Latitude: 45.4971, Longitude: -73.5789}
	body, _ := json.Marshal(createReq)
	req := httptest.NewRequest(http.MethodPost, "/favorites", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+token)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	var created domain.Favorite
	json.Unmarshal(w.Body.Bytes(), &created)

	// Delete it
	req = httptest.NewRequest(http.MethodDelete, "/favorites/"+created.ID, nil)
	req.Header.Set("Authorization", "Bearer "+token)
	w = httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status %d, got %d: %s", http.StatusOK, w.Code, w.Body.String())
	}
}

func TestDeleteFavoriteNotFound(t *testing.T) {
	gin.SetMode(gin.TestMode)
	_, jwtManager, router := setupFavoritesTest(t)
	token := makeFavoriteToken(jwtManager, "user-1")

	req := httptest.NewRequest(http.MethodDelete, "/favorites/nonexistent-id", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusNotFound {
		t.Errorf("Expected status %d, got %d", http.StatusNotFound, w.Code)
	}
}

func TestDeleteFavoriteWrongUser(t *testing.T) {
	gin.SetMode(gin.TestMode)
	_, jwtManager, router := setupFavoritesTest(t)
	token1 := makeFavoriteToken(jwtManager, "user-1")
	token2 := makeFavoriteToken(jwtManager, "user-2")

	// Create a favorite as user-1
	createReq := handler.CreateFavoriteRequest{Name: "Home", Latitude: 45.4971, Longitude: -73.5789}
	body, _ := json.Marshal(createReq)
	req := httptest.NewRequest(http.MethodPost, "/favorites", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+token1)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	var created domain.Favorite
	json.Unmarshal(w.Body.Bytes(), &created)

	// user-2 tries to delete user-1's favorite → 404
	req = httptest.NewRequest(http.MethodDelete, "/favorites/"+created.ID, nil)
	req.Header.Set("Authorization", "Bearer "+token2)
	w = httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusNotFound {
		t.Errorf("Expected status %d (ownership enforced), got %d", http.StatusNotFound, w.Code)
	}
}

// ---- Anonymous user tests ----

func TestCreateFavoriteAnonymousSuccess(t *testing.T) {
	gin.SetMode(gin.TestMode)
	_, _, router := setupFavoritesTest(t)

	reqBody := handler.CreateFavoriteRequest{Name: "Home", Latitude: 45.4971, Longitude: -73.5789}
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
	if fav.UserID != "" {
		t.Errorf("Expected empty userID for anonymous, got %s", fav.UserID)
	}
}

func TestGetFavoritesAnonymousSuccess(t *testing.T) {
	gin.SetMode(gin.TestMode)
	_, _, router := setupFavoritesTest(t)

	// Create an anonymous favorite
	createReq := handler.CreateFavoriteRequest{Name: "Home", Latitude: 45.4971, Longitude: -73.5789}
	body, _ := json.Marshal(createReq)
	req := httptest.NewRequest(http.MethodPost, "/favorites", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusCreated {
		t.Fatalf("Setup: anonymous create failed with status %d", w.Code)
	}

	// Get favorites without auth
	req = httptest.NewRequest(http.MethodGet, "/favorites", nil)
	w = httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status %d, got %d", http.StatusOK, w.Code)
	}

	var favorites []domain.Favorite
	json.Unmarshal(w.Body.Bytes(), &favorites)
	if len(favorites) != 1 {
		t.Errorf("Expected 1 anonymous favorite, got %d", len(favorites))
	}
}

func TestDeleteFavoriteAnonymousSuccess(t *testing.T) {
	gin.SetMode(gin.TestMode)
	_, _, router := setupFavoritesTest(t)

	// Create an anonymous favorite
	createReq := handler.CreateFavoriteRequest{Name: "Home", Latitude: 45.4971, Longitude: -73.5789}
	body, _ := json.Marshal(createReq)
	req := httptest.NewRequest(http.MethodPost, "/favorites", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	var created domain.Favorite
	json.Unmarshal(w.Body.Bytes(), &created)

	// Delete it without auth
	req = httptest.NewRequest(http.MethodDelete, "/favorites/"+created.ID, nil)
	w = httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status %d, got %d: %s", http.StatusOK, w.Code, w.Body.String())
	}
}

func TestGetFavoritesEmptyList(t *testing.T) {
	gin.SetMode(gin.TestMode)
	_, _, router := setupFavoritesTest(t)

	req := httptest.NewRequest(http.MethodGet, "/favorites", nil)
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

func TestFavoritesIsolatedBetweenAuthAndAnonymous(t *testing.T) {
	gin.SetMode(gin.TestMode)
	_, jwtManager, router := setupFavoritesTest(t)
	token := makeFavoriteToken(jwtManager, "user-1")

	// Create an authenticated favorite
	createReq := handler.CreateFavoriteRequest{Name: "Auth Home"}
	body, _ := json.Marshal(createReq)
	req := httptest.NewRequest(http.MethodPost, "/favorites", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+token)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusCreated {
		t.Fatalf("Authenticated create failed: %d", w.Code)
	}

	// Anonymous user should see 0 favorites
	req = httptest.NewRequest(http.MethodGet, "/favorites", nil)
	w = httptest.NewRecorder()
	router.ServeHTTP(w, req)

	var anonFavs []domain.Favorite
	json.Unmarshal(w.Body.Bytes(), &anonFavs)
	if len(anonFavs) != 0 {
		t.Errorf("Anonymous user should not see authenticated user's favorites, got %d", len(anonFavs))
	}
}
