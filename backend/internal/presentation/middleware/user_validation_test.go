package middleware_test

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/works-on-my-machine-390/concordia-waze/internal/presentation/middleware"
)

func TestValidateUserOwnershipSuccess(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()

	// Setup middleware
	router.Use(func(c *gin.Context) {
		c.Set("userID", "user123")
		c.Next()
	})
	router.Use(middleware.ValidateUserOwnership())

	router.GET("/users/:userId/profile", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"message": "success"})
	})

	req := httptest.NewRequest("GET", "/users/user123/profile", nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status %d, got %d", http.StatusOK, w.Code)
	}
}

func TestValidateUserOwnershipForbidden(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()

	// Setup middleware with different user
	router.Use(func(c *gin.Context) {
		c.Set("userID", "user123")
		c.Next()
	})
	router.Use(middleware.ValidateUserOwnership())

	router.GET("/users/:userId/profile", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"message": "success"})
	})

	// Try to access another user's data
	req := httptest.NewRequest("GET", "/users/user456/profile", nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	if w.Code != http.StatusForbidden {
		t.Errorf("Expected status %d, got %d", http.StatusForbidden, w.Code)
	}
}

func TestValidateUserOwnershipUnauthorized(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()

	// No userID set in context
	router.Use(middleware.ValidateUserOwnership())

	router.GET("/users/:userId/profile", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"message": "success"})
	})

	req := httptest.NewRequest("GET", "/users/user123/profile", nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("Expected status %d, got %d", http.StatusUnauthorized, w.Code)
	}
}

func TestValidateUserOwnershipNoUserIdParam(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()

	// Setup middleware
	router.Use(func(c *gin.Context) {
		c.Set("userID", "user123")
		c.Next()
	})
	router.Use(middleware.ValidateUserOwnership())

	// Route without userId parameter
	router.GET("/public/data", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"message": "success"})
	})

	req := httptest.NewRequest("GET", "/public/data", nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	// Should allow access when no userId param exists
	if w.Code != http.StatusOK {
		t.Errorf("Expected status %d, got %d", http.StatusOK, w.Code)
	}
}
