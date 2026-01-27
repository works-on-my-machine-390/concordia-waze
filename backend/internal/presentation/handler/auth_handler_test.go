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
	"github.com/works-on-my-machine-390/concordia-waze/internal/persistence/repository"
	"github.com/works-on-my-machine-390/concordia-waze/internal/presentation/handler"
	"github.com/works-on-my-machine-390/concordia-waze/internal/presentation/middleware"
)

func setupAuthTest(t *testing.T) (*handler.AuthHandler, *application.JWTManager) {
	repo := repository.NewInMemoryUserRepository()
	jwtManager := application.NewJWTManager("test-secret-key", 24*time.Hour)
	userService := application.NewUserService(repo, jwtManager)
	authHandler := handler.NewAuthHandler(userService)
	return authHandler, jwtManager
}

func TestSignUp_Success(t *testing.T) {
	gin.SetMode(gin.TestMode)
	authHandler, _ := setupAuthTest(t)

	router := gin.New()
	router.POST("/auth/signup", authHandler.SignUp)

	reqBody := handler.SignUpRequest{
		Name:      "John Doe",
		StudentID: "40123456",
		Email:     "john.doe@concordia.ca",
		Password:  "password123",
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

func TestSignUp_InvalidEmail(t *testing.T) {
	gin.SetMode(gin.TestMode)
	authHandler, _ := setupAuthTest(t)

	router := gin.New()
	router.POST("/auth/signup", authHandler.SignUp)

	reqBody := handler.SignUpRequest{
		Name:      "John Doe",
		StudentID: "40123456",
		Email:     "john@gmail.com",
		Password:  "password123",
	}

	body, _ := json.Marshal(reqBody)
	req := httptest.NewRequest("POST", "/auth/signup", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("Expected status %d, got %d", http.StatusBadRequest, w.Code)
	}
}

func TestSignUp_MissingFields(t *testing.T) {
	tests := []struct {
		name     string
		req      handler.SignUpRequest
		wantCode int
	}{
		{
			name: "missing name",
			req: handler.SignUpRequest{
				Name:      "",
				StudentID: "40123456",
				Email:     "john.doe@concordia.ca",
				Password:  "password123",
			},
			wantCode: http.StatusBadRequest,
		},
		{
			name: "missing student_id",
			req: handler.SignUpRequest{
				Name:      "John Doe",
				StudentID: "",
				Email:     "john.doe@concordia.ca",
				Password:  "password123",
			},
			wantCode: http.StatusBadRequest,
		},
		{
			name: "missing email",
			req: handler.SignUpRequest{
				Name:      "John Doe",
				StudentID: "40123456",
				Email:     "",
				Password:  "password123",
			},
			wantCode: http.StatusBadRequest,
		},
		{
			name: "missing password",
			req: handler.SignUpRequest{
				Name:      "John Doe",
				StudentID: "40123456",
				Email:     "john.doe@concordia.ca",
				Password:  "",
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

func TestLogin_Success(t *testing.T) {
	gin.SetMode(gin.TestMode)
	authHandler, _ := setupAuthTest(t)

	router := gin.New()
	router.POST("/auth/signup", authHandler.SignUp)
	router.POST("/auth/login", authHandler.Login)

	// Signup first
	signupReq := handler.SignUpRequest{
		Name:      "John Doe",
		StudentID: "40123456",
		Email:     "john.doe@concordia.ca",
		Password:  "password123",
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

func TestLogin_WrongPassword(t *testing.T) {
	gin.SetMode(gin.TestMode)
	authHandler, _ := setupAuthTest(t)

	router := gin.New()
	router.POST("/auth/signup", authHandler.SignUp)
	router.POST("/auth/login", authHandler.Login)

	// Signup
	signupReq := handler.SignUpRequest{
		Name:      "John Doe",
		StudentID: "40123456",
		Email:     "john.doe@concordia.ca",
		Password:  "password123",
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

func TestLogin_UserNotFound(t *testing.T) {
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

func TestGetProfile_Success(t *testing.T) {
	gin.SetMode(gin.TestMode)
	authHandler, jwtManager := setupAuthTest(t)

	router := gin.New()
	router.Use(middleware.AuthMiddleware(jwtManager))
	router.POST("/auth/signup", authHandler.SignUp)
	router.GET("/auth/profile", middleware.RequireAuth(), authHandler.GetProfile)

	// Signup first
	signupReq := handler.SignUpRequest{
		Name:      "John Doe",
		StudentID: "40123456",
		Email:     "john.doe@concordia.ca",
		Password:  "password123",
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

func TestGetProfile_NoToken(t *testing.T) {
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

func TestGetProfile_InvalidToken(t *testing.T) {
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
