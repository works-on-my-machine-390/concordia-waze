package handler_test

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"sync"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/works-on-my-machine-390/concordia-waze/internal/application"
	"github.com/works-on-my-machine-390/concordia-waze/internal/persistence/repository"
	"github.com/works-on-my-machine-390/concordia-waze/internal/presentation/handler"
	"github.com/works-on-my-machine-390/concordia-waze/internal/presentation/middleware"
)

type fakeProfileService struct {
	mu       sync.Mutex
	profiles map[string]application.User
}

func newFakeProfileService() *fakeProfileService {
	return &fakeProfileService{profiles: make(map[string]application.User)}
}

func (f *fakeProfileService) CreateUserProfile(ctx context.Context, userID string, profile application.User) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	profile.UserID = userID
	f.profiles[userID] = profile
	return nil
}

func (f *fakeProfileService) GetUserProfile(ctx context.Context, userID string) (*application.User, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	profile, ok := f.profiles[userID]
	if !ok {
		return &application.User{UserID: userID, Email: "", FirstName: "", LastName: ""}, nil
	}
	return &profile, nil
}

func (f *fakeProfileService) GetUserProfileByEmail(ctx context.Context, email string) (*application.User, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	for _, profile := range f.profiles {
		if profile.Email == email {
			return &profile, nil
		}
	}
	return nil, nil // Not found returns nil profile, nil error (updated handler checks for nil profile)
}

func setupAuthTest(t *testing.T) (*handler.AuthHandler, *application.JWTManager) {
	repo := repository.NewInMemoryUserRepository()
	jwtManager := application.NewJWTManager("test-secret-key", 24*time.Hour)
	userService := application.NewUserService(repo, jwtManager)
	authHandler := handler.NewAuthHandler(userService, newFakeProfileService())
	return authHandler, jwtManager
}

func TestSignUpSuccess(t *testing.T) {
	gin.SetMode(gin.TestMode)
	authHandler, _ := setupAuthTest(t)

	router := gin.New()
	router.POST("/auth/signup", authHandler.SignUp)

	reqBody := handler.SignUpRequest{
		Name:     "John Doe",
		Email:    "john.doe@concordia.ca",
		Password: "password123",
	}

	body, _ := json.Marshal(reqBody)
	req := httptest.NewRequest("POST", "/auth/signup", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	if w.Code != http.StatusCreated {
		t.Errorf("Expected status %d, got %d", http.StatusCreated, w.Code)
	}

	var response handler.AuthResponse
	json.Unmarshal(w.Body.Bytes(), &response)

	if response.Email != "john.doe@concordia.ca" {
		t.Errorf("Expected email 'john.doe@concordia.ca', got %s", response.Email)
	}
	if response.Token == "" {
		t.Fatal("Expected token in response")
	}
	if response.ID == "" {
		t.Fatal("Expected ID in response")
	}
}

func TestSignUpMissingFields(t *testing.T) {
	tests := []struct {
		name     string
		req      handler.SignUpRequest
		wantCode int
	}{
		{
			name: "missing name",
			req: handler.SignUpRequest{
				Name:     "",
				Email:    "john.doe@concordia.ca",
				Password: "password123",
			},
			wantCode: http.StatusBadRequest,
		},
		{
			name: "missing email",
			req: handler.SignUpRequest{
				Name:     "John Doe",
				Email:    "",
				Password: "password123",
			},
			wantCode: http.StatusBadRequest,
		},
		{
			name: "missing password",
			req: handler.SignUpRequest{
				Name:     "John Doe",
				Email:    "john.doe@concordia.ca",
				Password: "",
			},
			wantCode: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			gin.SetMode(gin.TestMode)
			authHandler, _ := setupAuthTest(t)

			router := gin.New()
			router.POST("/auth/signup", authHandler.SignUp)

			body, _ := json.Marshal(tt.req)
			req := httptest.NewRequest("POST", "/auth/signup", bytes.NewBuffer(body))
			req.Header.Set("Content-Type", "application/json")
			w := httptest.NewRecorder()

			router.ServeHTTP(w, req)

			if w.Code != tt.wantCode {
				t.Errorf("Expected status %d, got %d", tt.wantCode, w.Code)
			}
		})
	}
}

func TestLoginSuccess(t *testing.T) {
	gin.SetMode(gin.TestMode)
	authHandler, _ := setupAuthTest(t)

	router := gin.New()
	router.POST("/auth/signup", authHandler.SignUp)
	router.POST("/auth/login", authHandler.Login)

	// Signup first
	signupReq := handler.SignUpRequest{
		Name:     "John Doe",
		Email:    "john.doe@concordia.ca",
		Password: "password123",
	}

	body, _ := json.Marshal(signupReq)
	req := httptest.NewRequest("POST", "/auth/signup", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	// Login
	loginReq := handler.LoginRequest{
		Email:    "john.doe@concordia.ca",
		Password: "password123",
	}

	body, _ = json.Marshal(loginReq)
	req = httptest.NewRequest("POST", "/auth/login", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	w = httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status %d, got %d", http.StatusOK, w.Code)
	}

	var response handler.AuthResponse
	json.Unmarshal(w.Body.Bytes(), &response)

	if response.Token == "" {
		t.Fatal("Expected token in response")
	}
}

func TestLoginWrongPassword(t *testing.T) {
	gin.SetMode(gin.TestMode)
	authHandler, _ := setupAuthTest(t)

	router := gin.New()
	router.POST("/auth/signup", authHandler.SignUp)
	router.POST("/auth/login", authHandler.Login)

	// Signup
	signupReq := handler.SignUpRequest{
		Name:     "John Doe",
		Email:    "john.doe@concordia.ca",
		Password: "password123",
	}

	body, _ := json.Marshal(signupReq)
	req := httptest.NewRequest("POST", "/auth/signup", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	// Try login with wrong password
	loginReq := handler.LoginRequest{
		Email:    "john.doe@concordia.ca",
		Password: "wrongpassword",
	}

	body, _ = json.Marshal(loginReq)
	req = httptest.NewRequest("POST", "/auth/login", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	w = httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("Expected status %d, got %d", http.StatusUnauthorized, w.Code)
	}
}

func TestLoginUserNotFound(t *testing.T) {
	gin.SetMode(gin.TestMode)
	authHandler, _ := setupAuthTest(t)

	router := gin.New()
	router.POST("/auth/login", authHandler.Login)

	loginReq := handler.LoginRequest{
		Email:    "nonexistent@concordia.ca",
		Password: "password123",
	}

	body, _ := json.Marshal(loginReq)
	req := httptest.NewRequest("POST", "/auth/login", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("Expected status %d, got %d", http.StatusUnauthorized, w.Code)
	}
}

func TestGetProfileSuccess(t *testing.T) {
	gin.SetMode(gin.TestMode)
	authHandler, jwtManager := setupAuthTest(t)

	router := gin.New()
	router.Use(middleware.AuthMiddleware(jwtManager))
	router.POST("/auth/signup", authHandler.SignUp)
	router.GET("/auth/profile", middleware.RequireAuth(), authHandler.GetProfile)

	// Signup first
	signupReq := handler.SignUpRequest{
		Name:     "John Doe",
		Email:    "john.doe@concordia.ca",
		Password: "password123",
	}

	body, _ := json.Marshal(signupReq)
	req := httptest.NewRequest("POST", "/auth/signup", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	var signupResp handler.AuthResponse
	json.Unmarshal(w.Body.Bytes(), &signupResp)

	// Get profile with token
	req = httptest.NewRequest("GET", "/auth/profile", nil)
	req.Header.Set("Authorization", "Bearer "+signupResp.Token)
	w = httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status %d, got %d", http.StatusOK, w.Code)
		t.Logf("Response: %s", w.Body.String())
	}

	var profileResp handler.AuthResponse
	json.Unmarshal(w.Body.Bytes(), &profileResp)

	if profileResp.Email != "john.doe@concordia.ca" {
		t.Errorf("Expected email 'john.doe@concordia.ca', got %s", profileResp.Email)
	}
}

func TestGetProfileNoToken(t *testing.T) {
	gin.SetMode(gin.TestMode)
	authHandler, jwtManager := setupAuthTest(t)

	router := gin.New()
	router.Use(middleware.AuthMiddleware(jwtManager))
	router.GET("/auth/profile", middleware.RequireAuth(), authHandler.GetProfile)

	req := httptest.NewRequest("GET", "/auth/profile", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("Expected status %d, got %d", http.StatusUnauthorized, w.Code)
	}
}

func TestGetProfileInvalidToken(t *testing.T) {
	gin.SetMode(gin.TestMode)
	authHandler, jwtManager := setupAuthTest(t)

	router := gin.New()
	router.Use(middleware.AuthMiddleware(jwtManager))
	router.GET("/auth/profile", middleware.RequireAuth(), authHandler.GetProfile)

	req := httptest.NewRequest("GET", "/auth/profile", nil)
	req.Header.Set("Authorization", "Bearer invalid.token.here")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("Expected status %d, got %d", http.StatusUnauthorized, w.Code)
	}
}

func TestLogoutSuccess(t *testing.T) {
	gin.SetMode(gin.TestMode)
	authHandler, jwtManager := setupAuthTest(t)

	router := gin.New()
	router.Use(middleware.AuthMiddleware(jwtManager))
	router.POST("/auth/signup", authHandler.SignUp)
	router.POST("/auth/logout", middleware.RequireAuth(), authHandler.Logout)

	// Signup first
	signupReq := handler.SignUpRequest{
		Name:     "John Doe",
		Email:    "john.doe@concordia.ca",
		Password: "password123",
	}

	body, _ := json.Marshal(signupReq)
	req := httptest.NewRequest("POST", "/auth/signup", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	var signupResp handler.AuthResponse
	json.Unmarshal(w.Body.Bytes(), &signupResp)

	// Logout
	req = httptest.NewRequest("POST", "/auth/logout", nil)
	req.Header.Set("Authorization", "Bearer "+signupResp.Token)
	w = httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status %d, got %d", http.StatusOK, w.Code)
	}
}

func TestLogoutNoToken(t *testing.T) {
	gin.SetMode(gin.TestMode)
	authHandler, jwtManager := setupAuthTest(t)

	router := gin.New()
	router.Use(middleware.AuthMiddleware(jwtManager))
	router.POST("/auth/logout", middleware.RequireAuth(), authHandler.Logout)

	req := httptest.NewRequest("POST", "/auth/logout", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("Expected status %d, got %d", http.StatusUnauthorized, w.Code)
	}
}

func TestLogoutInvalidToken(t *testing.T) {
	gin.SetMode(gin.TestMode)
	authHandler, jwtManager := setupAuthTest(t)

	router := gin.New()
	router.Use(middleware.AuthMiddleware(jwtManager))
	router.POST("/auth/logout", middleware.RequireAuth(), authHandler.Logout)

	req := httptest.NewRequest("POST", "/auth/logout", nil)
	req.Header.Set("Authorization", "Bearer invalid.token.here")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("Expected status %d, got %d", http.StatusUnauthorized, w.Code)
	}
}

func TestLogoutTokenRevoked(t *testing.T) {
	gin.SetMode(gin.TestMode)
	authHandler, jwtManager := setupAuthTest(t)

	repo := repository.NewInMemoryUserRepository()
	userService := application.NewUserService(repo, jwtManager)
	authHandler = handler.NewAuthHandler(userService, newFakeProfileService())

	router := gin.New()
	router.Use(middleware.AuthMiddleware(jwtManager))
	router.POST("/auth/signup", authHandler.SignUp)
	router.POST("/auth/logout", middleware.RequireAuth(), authHandler.Logout)
	router.GET("/auth/profile", middleware.RequireAuth(), authHandler.GetProfile)

	// Signup
	signupReq := handler.SignUpRequest{
		Name:     "John Doe",
		Email:    "john.doe@concordia.ca",
		Password: "password123",
	}

	body, _ := json.Marshal(signupReq)
	req := httptest.NewRequest("POST", "/auth/signup", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	var signupResp handler.AuthResponse
	json.Unmarshal(w.Body.Bytes(), &signupResp)

	// Logout
	req = httptest.NewRequest("POST", "/auth/logout", nil)
	req.Header.Set("Authorization", "Bearer "+signupResp.Token)
	w = httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status %d, got %d", http.StatusOK, w.Code)
	}

	// Try to use token after logout
	req = httptest.NewRequest("GET", "/auth/profile", nil)
	req.Header.Set("Authorization", "Bearer "+signupResp.Token)
	w = httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("Expected status %d after logout, got %d", http.StatusUnauthorized, w.Code)
	}
}
