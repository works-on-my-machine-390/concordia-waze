package handler

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"golang.org/x/oauth2"
)

// fakeStore implements the minimal GoogleTokenStore for unit tests.
type fakeStore struct {
	// returned token and ok flag for GetGoogleToken
	token *oauth2.Token
	ok    bool

	// record save calls
	savedUser string
	savedTok  *oauth2.Token
}

func (f *fakeStore) GetGoogleToken(ctx context.Context, userID string) (*oauth2.Token, bool, error) {
	return f.token, f.ok, nil
}

func (f *fakeStore) SaveGoogleToken(ctx context.Context, userID string, token *oauth2.Token) error {
	f.savedUser = userID
	f.savedTok = token
	return nil
}

func setupRouter(h *GoogleOAuthHandler) *gin.Engine {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	// matches the updated handler routes
	r.GET("/auth/google/status", h.GetAuthStatus)
	r.GET("/auth/google/callback", h.Callback)
	return r
}

func TestGetAuthStatus_MissingUserID(t *testing.T) {
	// Handler does not need a real store for this test because the
	// missing-userId check happens before any store calls.
	h := NewGoogleOAuthHandler(&fakeStore{})
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

func TestGetAuthStatus_NoTokenStored_ReturnsURL(t *testing.T) {
	// Provide env vars required by GenerateAuthURL and state creation.
	_ = testingSetEnv("GOOGLE_CLIENT_ID", "dummy-client-id")
	_ = testingSetEnv("GOOGLE_CLIENT_SECRET", "dummy-client-secret")
	_ = testingSetEnv("GOOGLE_REDIRECT_URL", "http://localhost/auth/google/callback")
	_ = testingSetEnv("JWT_SECRET", "test-secret")

	store := &fakeStore{
		token: nil,
		ok:    false,
	}
	h := NewGoogleOAuthHandler(store)
	router := setupRouter(h)

	req := httptest.NewRequest(http.MethodGet, "/auth/google/status?userId=test-user", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d; body=%s", http.StatusOK, w.Code, w.Body.String())
	}

	var resp map[string]string
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("failed to unmarshal response: %v", err)
	}

	url, ok := resp["url"]
	if !ok || url == "" {
		t.Fatalf("expected url field in response, got: %v", resp)
	}
}

func TestGetAuthStatus_ValidToken_ReturnsOK(t *testing.T) {
	// token with expiry in future
	tok := &oauth2.Token{
		AccessToken:  "at",
		RefreshToken: "rt",
		Expiry:       time.Now().Add(10 * time.Minute),
	}
	store := &fakeStore{
		token: tok,
		ok:    true,
	}
	h := NewGoogleOAuthHandler(store)
	router := setupRouter(h)

	req := httptest.NewRequest(http.MethodGet, "/auth/google/status?userId=test-user", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d; body=%s", http.StatusOK, w.Code, w.Body.String())
	}

	var resp map[string]bool
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("failed to unmarshal response: %v", err)
	}

	if ok, found := resp["ok"]; !found || !ok {
		t.Fatalf("expected {\"ok\": true}, got: %v", resp)
	}
}

func TestCallback_MissingParams(t *testing.T) {
	h := NewGoogleOAuthHandler(&fakeStore{})
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

// testingSetEnv is a helper to set env var during test and return a cleanup func
func testingSetEnv(key, val string) error {
	return os.Setenv(key, val)
}
