package handler

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"

	"github.com/works-on-my-machine-390/concordia-waze/internal/application"
)

func setupRouter(h *GoogleOAuthHandler) *gin.Engine {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	// matches the updated handler routes
	r.GET("/auth/google/status", h.GetAuthStatus)
	r.GET("/auth/google/callback", h.Callback)
	return r
}

func TestGetAuthStatus_MissingUserID(t *testing.T) {
	// Handler does not need a real FirebaseService for this test because the
	// missing-userId check happens before any firebase calls.
	h := NewGoogleOAuthHandler(&application.FirebaseService{})
	router := setupRouter(h)

	req := httptest.NewRequest(http.MethodGet, "/auth/google/status", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected status %d, got %d; body=%s", http.StatusBadRequest, w.Code, w.Body.String())
	}

	var resp map[string]string
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("failed to unmarshal response: %v", err)
	}
	if resp["error"] == "" {
		t.Fatalf("expected error message in response, got: %v", resp)
	}
}

func TestCallback_MissingParams(t *testing.T) {
	// Callback returns 400 when code/state are missing; no firebase needed.
	h := NewGoogleOAuthHandler(&application.FirebaseService{})
	router := setupRouter(h)

	req := httptest.NewRequest(http.MethodGet, "/auth/google/callback", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected status %d, got %d; body=%s", http.StatusBadRequest, w.Code, w.Body.String())
	}

	var resp map[string]string
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("failed to unmarshal response: %v", err)
	}
	if resp["error"] == "" {
		t.Fatalf("expected error message in response, got: %v", resp)
	}
}
