package handler_test

import (
	"bytes"
	"encoding/json"
	"errors"
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
	router.Use(middleware.AuthMiddleware(jwtManager))
	userFavGroup := router.Group("/users/:userId/favorites")
	{
		userFavGroup.POST("", favHandler.CreateFavorite)
		userFavGroup.GET("", favHandler.GetFavorites)
		userFavGroup.DELETE("/:id", favHandler.DeleteFavorite)
	}

	return favHandler, jwtManager, router
}

func makeFavoriteToken(jwtManager *application.JWTManager, userID string) string {
	user := &domain.User{ID: userID, Email: "test@concordia.ca"}
	token, _ := jwtManager.GenerateToken(user)
	return token
}

// favPath returns the base path for a user's favorites.
func favPath(userID string) string { return "/users/" + userID + "/favorites" }

// helper to build a pointer to a float64 value
func fp(v float64) *float64 { return &v }

// helper to build a pointer to an int value
func ip(v int) *int { return &v }

// ---- Outdoor: authenticated user tests ----

func TestCreateFavoriteSuccess(t *testing.T) {
	gin.SetMode(gin.TestMode)
	_, jwtManager, router := setupFavoritesTest(t)
	token := makeFavoriteToken(jwtManager, "user-1")

	body, _ := json.Marshal(handler.CreateFavoriteRequest{
		Type: "outdoor", Name: "Home", Latitude: 45.4971, Longitude: -73.5789,
	})
	req := httptest.NewRequest(http.MethodPost, favPath("user-1"), bytes.NewBuffer(body))
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
	if fav.Type != domain.FavoriteTypeOutdoor {
		t.Errorf("Expected type outdoor, got %s", fav.Type)
	}
}

// TestCreateFavoriteBackwardCompat verifies that omitting "type" defaults to outdoor.
func TestCreateFavoriteBackwardCompat(t *testing.T) {
	gin.SetMode(gin.TestMode)
	_, jwtManager, router := setupFavoritesTest(t)
	token := makeFavoriteToken(jwtManager, "user-1")

	// Old-style request: no "type" field, just name + lat/lng
	body, _ := json.Marshal(map[string]interface{}{
		"name": "Legacy Place", "latitude": 45.4971, "longitude": -73.5789,
	})
	req := httptest.NewRequest(http.MethodPost, favPath("user-1"), bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+token)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusCreated {
		t.Errorf("Expected 201 for backward-compat request, got %d: %s", w.Code, w.Body.String())
	}
	var fav domain.Favorite
	json.Unmarshal(w.Body.Bytes(), &fav)
	if fav.Type != domain.FavoriteTypeOutdoor {
		t.Errorf("Expected type outdoor for legacy request, got %s", fav.Type)
	}
}

func TestCreateFavoriteInvalidBody(t *testing.T) {
	gin.SetMode(gin.TestMode)
	_, jwtManager, router := setupFavoritesTest(t)
	token := makeFavoriteToken(jwtManager, "user-1")

	req := httptest.NewRequest(http.MethodPost, favPath("user-1"), bytes.NewBufferString("{"))
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

	body, _ := json.Marshal(map[string]interface{}{
		"type": "outdoor", "latitude": 45.4971, "longitude": -73.5789,
	})
	req := httptest.NewRequest(http.MethodPost, favPath("user-1"), bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+token)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("Expected status %d, got %d", http.StatusBadRequest, w.Code)
	}
}

func TestCreateOutdoorFavoriteMissingCoords(t *testing.T) {
	gin.SetMode(gin.TestMode)
	_, jwtManager, router := setupFavoritesTest(t)
	token := makeFavoriteToken(jwtManager, "user-1")

	body, _ := json.Marshal(handler.CreateFavoriteRequest{Type: "outdoor", Name: "No Coords"})
	req := httptest.NewRequest(http.MethodPost, favPath("user-1"), bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+token)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("Expected 400 for missing outdoor coords, got %d: %s", w.Code, w.Body.String())
	}
}

func TestCreateFavoriteInvalidType(t *testing.T) {
	gin.SetMode(gin.TestMode)
	_, jwtManager, router := setupFavoritesTest(t)
	token := makeFavoriteToken(jwtManager, "user-1")

	body, _ := json.Marshal(map[string]interface{}{"type": "flying", "name": "Nowhere"})
	req := httptest.NewRequest(http.MethodPost, favPath("user-1"), bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+token)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("Expected 400 for invalid type, got %d", w.Code)
	}
}

func TestGetFavoritesSuccess(t *testing.T) {
	gin.SetMode(gin.TestMode)
	_, jwtManager, router := setupFavoritesTest(t)
	token := makeFavoriteToken(jwtManager, "user-1")

	// Create a favorite
	body, _ := json.Marshal(handler.CreateFavoriteRequest{
		Type: "outdoor", Name: "Home", Latitude: 45.4971, Longitude: -73.5789,
	})
	req := httptest.NewRequest(http.MethodPost, favPath("user-1"), bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+token)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	if w.Code != http.StatusCreated {
		t.Fatalf("Setup: create favorite failed with status %d", w.Code)
	}

	// List favorites
	req = httptest.NewRequest(http.MethodGet, favPath("user-1"), nil)
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

	body, _ := json.Marshal(handler.CreateFavoriteRequest{
		Type: "outdoor", Name: "Home", Latitude: 45.4971, Longitude: -73.5789,
	})
	req := httptest.NewRequest(http.MethodPost, favPath("user-1"), bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+token)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	var created domain.Favorite
	json.Unmarshal(w.Body.Bytes(), &created)

	req = httptest.NewRequest(http.MethodDelete, favPath("user-1")+"/"+created.ID, nil)
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

	req := httptest.NewRequest(http.MethodDelete, favPath("user-1")+"/nonexistent-id", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusNotFound {
		t.Errorf("Expected status %d, got %d", http.StatusNotFound, w.Code)
	}
}

// TestDeleteFavoriteWrongUser verifies that user-2's token cannot access user-1's path.
func TestDeleteFavoriteWrongUser(t *testing.T) {
	gin.SetMode(gin.TestMode)
	_, jwtManager, router := setupFavoritesTest(t)
	token1 := makeFavoriteToken(jwtManager, "user-1")
	token2 := makeFavoriteToken(jwtManager, "user-2")

	body, _ := json.Marshal(handler.CreateFavoriteRequest{
		Type: "outdoor", Name: "Home", Latitude: 45.4971, Longitude: -73.5789,
	})
	req := httptest.NewRequest(http.MethodPost, favPath("user-1"), bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+token1)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	var created domain.Favorite
	json.Unmarshal(w.Body.Bytes(), &created)

	// user-2 tries to delete from user-1's path → 403
	req = httptest.NewRequest(http.MethodDelete, favPath("user-1")+"/"+created.ID, nil)
	req.Header.Set("Authorization", "Bearer "+token2)
	w = httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusForbidden {
		t.Errorf("Expected status %d (token/path mismatch), got %d", http.StatusForbidden, w.Code)
	}
}

// ---- Indoor favorites tests ----

func TestCreateIndoorFavoriteSuccess(t *testing.T) {
	gin.SetMode(gin.TestMode)
	_, jwtManager, router := setupFavoritesTest(t)
	token := makeFavoriteToken(jwtManager, "user-1")

	body, _ := json.Marshal(handler.CreateFavoriteRequest{
		Type:         "indoor",
		Name:         "Room 281",
		BuildingCode: "H",
		FloorNumber:  ip(2),
		X:            fp(0.8749),
		Y:            fp(0.4326),
		PoiType:      "room",
	})
	req := httptest.NewRequest(http.MethodPost, favPath("user-1"), bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+token)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusCreated {
		t.Fatalf("Expected 201, got %d: %s", w.Code, w.Body.String())
	}
	var fav domain.Favorite
	json.Unmarshal(w.Body.Bytes(), &fav)
	if fav.Type != domain.FavoriteTypeIndoor {
		t.Errorf("Expected type indoor, got %s", fav.Type)
	}
	if fav.BuildingCode != "H" {
		t.Errorf("Expected buildingCode 'H', got %s", fav.BuildingCode)
	}
	if fav.FloorNumber != 2 {
		t.Errorf("Expected floorNumber 2, got %d", fav.FloorNumber)
	}
	if fav.PoiType != "room" {
		t.Errorf("Expected poiType 'room', got %s", fav.PoiType)
	}
	if fav.ID == "" {
		t.Fatal("Expected ID in response")
	}
}

func TestCreateIndoorFavoriteMissingBuildingCode(t *testing.T) {
	gin.SetMode(gin.TestMode)
	_, jwtManager, router := setupFavoritesTest(t)
	token := makeFavoriteToken(jwtManager, "user-1")

	body, _ := json.Marshal(handler.CreateFavoriteRequest{
		Type: "indoor", Name: "Some Room",
		FloorNumber: ip(2), X: fp(0.5), Y: fp(0.5),
		// BuildingCode intentionally omitted
	})
	req := httptest.NewRequest(http.MethodPost, favPath("user-1"), bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+token)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("Expected 400 for missing buildingCode, got %d", w.Code)
	}
}

func TestCreateIndoorFavoriteMissingFloorNumber(t *testing.T) {
	gin.SetMode(gin.TestMode)
	_, jwtManager, router := setupFavoritesTest(t)
	token := makeFavoriteToken(jwtManager, "user-1")

	body, _ := json.Marshal(handler.CreateFavoriteRequest{
		Type:         "indoor",
		Name:         "Some Room",
		BuildingCode: "H",
		X:            fp(0.5),
		Y:            fp(0.5),
		// FloorNumber intentionally omitted (nil)
	})
	req := httptest.NewRequest(http.MethodPost, favPath("user-1"), bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+token)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("Expected 400 for missing floorNumber, got %d", w.Code)
	}
}

func TestCreateIndoorFavoriteMissingXY(t *testing.T) {
	gin.SetMode(gin.TestMode)
	_, jwtManager, router := setupFavoritesTest(t)
	token := makeFavoriteToken(jwtManager, "user-1")

	body, _ := json.Marshal(handler.CreateFavoriteRequest{
		Type:         "indoor",
		Name:         "Some Room",
		BuildingCode: "H",
		FloorNumber:  ip(1),
		// X and Y intentionally omitted (nil)
	})
	req := httptest.NewRequest(http.MethodPost, favPath("user-1"), bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+token)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("Expected 400 for missing x/y, got %d", w.Code)
	}
}

func TestGetFavoritesContainsBothTypes(t *testing.T) {
	gin.SetMode(gin.TestMode)
	_, jwtManager, router := setupFavoritesTest(t)
	token := makeFavoriteToken(jwtManager, "user-1")

	// Create outdoor
	outdoorBody, _ := json.Marshal(handler.CreateFavoriteRequest{
		Type: "outdoor", Name: "Outdoor Spot", Latitude: 45.4971, Longitude: -73.5789,
	})
	req := httptest.NewRequest(http.MethodPost, favPath("user-1"), bytes.NewBuffer(outdoorBody))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+token)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	if w.Code != http.StatusCreated {
		t.Fatalf("Create outdoor failed: %d", w.Code)
	}

	// Create indoor
	indoorBody, _ := json.Marshal(handler.CreateFavoriteRequest{
		Type: "indoor", Name: "Room 100", BuildingCode: "MB",
		FloorNumber: ip(1), X: fp(0.3), Y: fp(0.7),
	})
	req = httptest.NewRequest(http.MethodPost, favPath("user-1"), bytes.NewBuffer(indoorBody))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+token)
	w = httptest.NewRecorder()
	router.ServeHTTP(w, req)
	if w.Code != http.StatusCreated {
		t.Fatalf("Create indoor failed: %d", w.Code)
	}

	// Get all
	req = httptest.NewRequest(http.MethodGet, favPath("user-1"), nil)
	req.Header.Set("Authorization", "Bearer "+token)
	w = httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected 200, got %d", w.Code)
	}
	var favs []domain.Favorite
	json.Unmarshal(w.Body.Bytes(), &favs)
	if len(favs) != 2 {
		t.Fatalf("Expected 2 favorites, got %d", len(favs))
	}
	types := map[domain.FavoriteType]bool{}
	for _, f := range favs {
		types[f.Type] = true
	}
	if !types[domain.FavoriteTypeOutdoor] || !types[domain.FavoriteTypeIndoor] {
		t.Error("Expected one outdoor and one indoor favorite in the list")
	}
}

// ---- Anonymous user tests ----

func TestCreateFavoriteAnonymousSuccess(t *testing.T) {
	gin.SetMode(gin.TestMode)
	_, _, router := setupFavoritesTest(t)

	body, _ := json.Marshal(handler.CreateFavoriteRequest{
		Type: "outdoor", Name: "Home", Latitude: 45.4971, Longitude: -73.5789,
	})
	req := httptest.NewRequest(http.MethodPost, favPath("anonymous"), bytes.NewBuffer(body))
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
	if fav.UserID != "anonymous" {
		t.Errorf("Expected userID %q for anonymous path request, got %q", "anonymous", fav.UserID)
	}
}

func TestGetFavoritesAnonymousSuccess(t *testing.T) {
	gin.SetMode(gin.TestMode)
	_, _, router := setupFavoritesTest(t)

	body, _ := json.Marshal(handler.CreateFavoriteRequest{
		Type: "outdoor", Name: "Home", Latitude: 45.4971, Longitude: -73.5789,
	})
	req := httptest.NewRequest(http.MethodPost, favPath("anonymous"), bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	if w.Code != http.StatusCreated {
		t.Fatalf("Setup: anonymous create failed with status %d", w.Code)
	}

	req = httptest.NewRequest(http.MethodGet, favPath("anonymous"), nil)
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

	body, _ := json.Marshal(handler.CreateFavoriteRequest{
		Type: "outdoor", Name: "Home", Latitude: 45.4971, Longitude: -73.5789,
	})
	req := httptest.NewRequest(http.MethodPost, favPath("anonymous"), bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	var created domain.Favorite
	json.Unmarshal(w.Body.Bytes(), &created)

	req = httptest.NewRequest(http.MethodDelete, favPath("anonymous")+"/"+created.ID, nil)
	w = httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status %d, got %d: %s", http.StatusOK, w.Code, w.Body.String())
	}
}

func TestGetFavoritesEmptyList(t *testing.T) {
	gin.SetMode(gin.TestMode)
	_, _, router := setupFavoritesTest(t)

	req := httptest.NewRequest(http.MethodGet, favPath("anonymous"), nil)
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

	// Create as authenticated user-1
	body, _ := json.Marshal(handler.CreateFavoriteRequest{
		Type: "outdoor", Name: "Auth Home", Latitude: 45.4971, Longitude: -73.5789,
	})
	req := httptest.NewRequest(http.MethodPost, favPath("user-1"), bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+token)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	if w.Code != http.StatusCreated {
		t.Fatalf("Authenticated create failed: %d", w.Code)
	}

	// Anonymous user should see 0 favorites (different bucket)
	req = httptest.NewRequest(http.MethodGet, favPath("anonymous"), nil)
	w = httptest.NewRecorder()
	router.ServeHTTP(w, req)

	var anonFavs []domain.Favorite
	json.Unmarshal(w.Body.Bytes(), &anonFavs)
	if len(anonFavs) != 0 {
		t.Errorf("Anonymous user should not see authenticated user's favorites, got %d", len(anonFavs))
	}
}

// TestCreateFavoriteWrongUserPath verifies 403 when token userId differs from path userId.
func TestCreateFavoriteWrongUserPath(t *testing.T) {
	gin.SetMode(gin.TestMode)
	_, jwtManager, router := setupFavoritesTest(t)
	token := makeFavoriteToken(jwtManager, "user-2")

	// Auth check fires before body parsing, so body content doesn't matter for this test
	body, _ := json.Marshal(handler.CreateFavoriteRequest{
		Type: "outdoor", Name: "Home", Latitude: 45.4971, Longitude: -73.5789,
	})
	req := httptest.NewRequest(http.MethodPost, favPath("user-1"), bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+token)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusForbidden {
		t.Errorf("Expected status %d, got %d", http.StatusForbidden, w.Code)
	}
}

// ---- Mock Service for Error Testing ----

type mockFavoritesServiceError struct{}

func (m *mockFavoritesServiceError) AddFavorite(fav *domain.Favorite) (*domain.Favorite, error) {
	return nil, errors.New("service add error")
}

func (m *mockFavoritesServiceError) GetFavorites(userID string) ([]*domain.Favorite, error) {
	return nil, errors.New("service get error")
}

func (m *mockFavoritesServiceError) DeleteFavorite(id, userID string) error {
	return errors.New("service delete error")
}

func TestFavoritesHandler_ServiceErrors(t *testing.T) {
	gin.SetMode(gin.TestMode)
	jwtManager := application.NewJWTManager("test-secret", time.Hour)
	token := makeFavoriteToken(jwtManager, "u1")

	h := handler.NewFavoritesHandler(&mockFavoritesServiceError{})

	r := gin.New()
	r.Use(middleware.AuthMiddleware(jwtManager))
	g := r.Group("/users/:userId/favorites")
	{
		g.POST("", h.CreateFavorite)
		g.GET("", h.GetFavorites)
		g.DELETE("/:id", h.DeleteFavorite)
	}

	// Test Create Error (valid outdoor payload so validation passes, hitting the service)
	body, _ := json.Marshal(handler.CreateFavoriteRequest{
		Type: "outdoor", Name: "Place", Latitude: 1, Longitude: 1,
	})
	req := httptest.NewRequest("POST", "/users/u1/favorites", bytes.NewBuffer(body))
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	if w.Code != http.StatusBadRequest {
		t.Errorf("Expected 400 for add error, got %d", w.Code)
	}

	// Test Get Error
	req = httptest.NewRequest("GET", "/users/u1/favorites", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	w = httptest.NewRecorder()
	r.ServeHTTP(w, req)
	if w.Code != http.StatusInternalServerError {
		t.Errorf("Expected 500 for get error, got %d", w.Code)
	}

	// Test Delete Error
	req = httptest.NewRequest("DELETE", "/users/u1/favorites/f1", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	w = httptest.NewRecorder()
	r.ServeHTTP(w, req)
	if w.Code != http.StatusInternalServerError {
		t.Errorf("Expected 500 for delete error, got %d", w.Code)
	}
}
