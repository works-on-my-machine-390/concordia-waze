package middleware_test

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/works-on-my-machine-390/concordia-waze/internal/application"
	"github.com/works-on-my-machine-390/concordia-waze/internal/domain"
	"github.com/works-on-my-machine-390/concordia-waze/internal/presentation/middleware"
)

func TestAuthMiddleware_WithValidToken(t *testing.T) {
	gin.SetMode(gin.TestMode)

	jwtManager := application.NewJWTManager("test-secret", time.Hour)
	user := &domain.User{
		ID:        "user-123",
		StudentID: "40123456",
		Email:     "john.doe@concordia.ca",
	}

	token, err := jwtManager.GenerateToken(user)
	if err != nil {
		t.Fatalf("Failed to generate token: %v", err)
	}

	router := gin.New()
	router.Use(middleware.AuthMiddleware(jwtManager))
	router.GET("/test", func(c *gin.Context) {
		claims := middleware.GetUserFromContext(c)
		if claims == nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "no claims"})
			return
		}
		c.JSON(http.StatusOK, gin.H{
			"id":         claims.ID,
			"student_id": claims.StudentID,
			"email":      claims.Email,
		})
	})

	req := httptest.NewRequest("GET", "/test", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status %d, got %d", http.StatusOK, w.Code)
	}
}

func TestAuthMiddleware_WithoutToken(t *testing.T) {
	gin.SetMode(gin.TestMode)

	jwtManager := application.NewJWTManager("test-secret", time.Hour)

	router := gin.New()
	router.Use(middleware.AuthMiddleware(jwtManager))
	router.GET("/test", func(c *gin.Context) {
		claims := middleware.GetUserFromContext(c)
		if claims == nil {
			c.JSON(http.StatusOK, gin.H{"authenticated": false})
			return
		}
		c.JSON(http.StatusOK, gin.H{"authenticated": true})
	})

	req := httptest.NewRequest("GET", "/test", nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status %d, got %d", http.StatusOK, w.Code)
	}
}

func TestAuthMiddleware_WithInvalidToken(t *testing.T) {
	gin.SetMode(gin.TestMode)

	jwtManager := application.NewJWTManager("test-secret", time.Hour)

	router := gin.New()
	router.Use(middleware.AuthMiddleware(jwtManager))
	router.GET("/test", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	req := httptest.NewRequest("GET", "/test", nil)
	req.Header.Set("Authorization", "Bearer invalid.token.here")
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("Expected status %d, got %d", http.StatusUnauthorized, w.Code)
	}
}

func TestAuthMiddleware_InvalidHeaderFormat(t *testing.T) {
	gin.SetMode(gin.TestMode)

	jwtManager := application.NewJWTManager("test-secret", time.Hour)

	router := gin.New()
	router.Use(middleware.AuthMiddleware(jwtManager))
	router.GET("/test", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	// Missing "Bearer" prefix
	req := httptest.NewRequest("GET", "/test", nil)
	req.Header.Set("Authorization", "invalid_format_token")
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("Expected status %d, got %d", http.StatusUnauthorized, w.Code)
	}
}

func TestRequireAuth_WithAuthentication(t *testing.T) {
	gin.SetMode(gin.TestMode)

	jwtManager := application.NewJWTManager("test-secret", time.Hour)
	user := &domain.User{
		ID:        "user-123",
		StudentID: "40123456",
		Email:     "john.doe@concordia.ca",
	}

	token, err := jwtManager.GenerateToken(user)
	if err != nil {
		t.Fatalf("Failed to generate token: %v", err)
	}

	router := gin.New()
	router.Use(middleware.AuthMiddleware(jwtManager))
	router.GET("/test", middleware.RequireAuth(), func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	req := httptest.NewRequest("GET", "/test", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status %d, got %d", http.StatusOK, w.Code)
	}
}

func TestRequireAuth_WithoutAuthentication(t *testing.T) {
	gin.SetMode(gin.TestMode)

	jwtManager := application.NewJWTManager("test-secret", time.Hour)

	router := gin.New()
	router.Use(middleware.AuthMiddleware(jwtManager))
	router.GET("/test", middleware.RequireAuth(), func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	req := httptest.NewRequest("GET", "/test", nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("Expected status %d, got %d", http.StatusUnauthorized, w.Code)
	}
}

func TestGetUserFromContext_WithClaims(t *testing.T) {
	jwtManager := application.NewJWTManager("test-secret", time.Hour)
	user := &domain.User{
		ID:        "user-123",
		StudentID: "40123456",
		Email:     "john.doe@concordia.ca",
	}

	token, _ := jwtManager.GenerateToken(user)

	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.Use(middleware.AuthMiddleware(jwtManager))
	router.GET("/test", func(c *gin.Context) {
		claims := middleware.GetUserFromContext(c)
		if claims == nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "no claims"})
			return
		}

		if claims.ID != user.ID {
			c.JSON(http.StatusBadRequest, gin.H{"error": "ID mismatch"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	req := httptest.NewRequest("GET", "/test", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status %d, got %d", http.StatusOK, w.Code)
	}
}

func TestGetUserFromContext_NoClaims(t *testing.T) {
	jwtManager := application.NewJWTManager("test-secret", time.Hour)

	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.Use(middleware.AuthMiddleware(jwtManager))
	router.GET("/test", func(c *gin.Context) {
		claims := middleware.GetUserFromContext(c)
		if claims != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "expected nil claims"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	req := httptest.NewRequest("GET", "/test", nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status %d, got %d", http.StatusOK, w.Code)
	}
}
