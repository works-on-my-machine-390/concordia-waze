package handler

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"

	"github.com/gin-gonic/gin"

	"github.com/works-on-my-machine-390/concordia-waze/internal/application"
)

func setupRouter(h *GoogleOAuthHandler) *gin.Engine {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.GET("/auth/google", h.GetAuthURL)
	r.GET("/auth/google/callback", h.Callback)
	return r
}

func TestGetAuthURL_MissingUserID(t *testing.T) {
	// Handler does not need a real FirebaseService for this test (GetAuthURL doesn't use it).
	h := NewGoogleOAuthHandler(&application.FirebaseService{})
	router := setupRouter(h)

	req := httptest.NewRequest(http.MethodGet, "/auth/google", nil)
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

func TestGetAuthURL_WithUserIDQuery(t *testing.T) {
	// Ensure required env vars for GenerateAuthURL exist (GenerateAuthURL builds an oauth2.Config).
	// These can be dummy values because AuthCodeURL does not perform network calls.
	_ = os.Setenv("GOOGLE_CLIENT_ID", "dummy-client-id")
	_ = os.Setenv("GOOGLE_CLIENT_SECRET", "dummy-client-secret")
	_ = os.Setenv("GOOGLE_REDIRECT_URL", "http://localhost/auth/google/callback")

	h := NewGoogleOAuthHandler(&application.FirebaseService{})
	router := setupRouter(h)

	req := httptest.NewRequest(http.MethodGet, "/auth/google?userId=test-user", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d; body=%s", http.StatusOK, w.Code, w.Body.String())
	}

	var resp struct {
		URL string `json:"url"`
	}
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("failed to unmarshal response: %v", err)
	}
	if resp.URL == "" {
		t.Fatalf("expected non-empty url in response, got empty; body=%s", w.Body.String())
	}
	// basic check that it looks like an auth URL
	if !(resp.URL[:4] == "http") {
		t.Fatalf("expected url to start with http(s), got: %s", resp.URL)
	}
}

func TestCallback_MissingParams(t *testing.T) {
	h := NewGoogleOAuthHandler(&application.FirebaseService{})
	router := setupRouter(h)

	// No query params -> should return 400
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
