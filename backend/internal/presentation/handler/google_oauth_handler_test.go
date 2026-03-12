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

// fakeStore implements GoogleTokenStore
type fakeStore struct {
	token     *oauth2.Token
	ok        bool
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

// fakeTokenSource returns the token supplied.
type fakeTokenSource struct {
	ret *oauth2.Token
	err error
}

func (f fakeTokenSource) Token() (*oauth2.Token, error) { return f.ret, f.err }

type fakeTSProvider struct {
	ts oauth2.TokenSource
}

func (p fakeTSProvider) TokenSource(ctx context.Context, t *oauth2.Token) oauth2.TokenSource {
	return p.ts
}

// fake parse and exchange
func fakeParseState(secret, token string) (string, error) {
	// simply return token as userID for tests
	return token, nil
}
func fakeExchangeCode(ctx context.Context, code string) (*oauth2.Token, error) {
	return &oauth2.Token{
		AccessToken:  "exchanged-access",
		RefreshToken: "exchanged-refresh",
		Expiry:       time.Now().Add(1 * time.Hour),
	}, nil
}

func setupRouterWithHandler(h *GoogleOAuthHandler) *gin.Engine {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.GET("/auth/google/status", h.GetAuthStatus)
	r.GET("/auth/google/callback", h.Callback)
	return r
}

func TestGetAuthStatus_ExpiredWithRefresh_SuccessfulRefreshAndPersist(t *testing.T) {
	// expired token with refresh token present
	expired := &oauth2.Token{
		AccessToken:  "old",
		RefreshToken: "rt",
		Expiry:       time.Now().Add(-10 * time.Minute),
	}
	store := &fakeStore{token: expired, ok: true}

	// token that the fake TokenSource will return as refreshed
	newTok := &oauth2.Token{
		AccessToken:  "new-access",
		RefreshToken: "new-refresh",
		Expiry:       time.Now().Add(1 * time.Hour),
	}
	tsProv := fakeTSProvider{ts: fakeTokenSource{ret: newTok, err: nil}}

	h := NewGoogleOAuthHandlerWithDeps(store, tsProv, fakeParseState, fakeExchangeCode)
	router := setupRouterWithHandler(h)

	req := httptest.NewRequest(http.MethodGet, "/auth/google/status?userId=test-user", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200 OK got %d body=%s", w.Code, w.Body.String())
	}

	var resp map[string]bool
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("invalid json response: %v", err)
	}
	if ok, exists := resp["ok"]; !exists || !ok {
		t.Fatalf("expected {\"ok\": true}, got %v", resp)
	}

	// ensure store saved the refreshed token
	if store.savedUser != "test-user" {
		t.Fatalf("expected savedUser set, got %q", store.savedUser)
	}
	if store.savedTok == nil || store.savedTok.AccessToken != "new-access" {
		t.Fatalf("expected saved token persisted, got: %+v", store.savedTok)
	}
}

func TestCallback_SuccessPersistsAndReturnsJSON(t *testing.T) {
	store := &fakeStore{}
	h := NewGoogleOAuthHandlerWithDeps(store, fakeTSProvider{}, fakeParseState, fakeExchangeCode)
	router := setupRouterWithHandler(h)

	// ensure FRONTEND_AUTH_SUCCESS_URL is empty so handler returns JSON
	_ = os.Unsetenv("FRONTEND_AUTH_SUCCESS_URL")

	req := httptest.NewRequest(http.MethodGet, "/auth/google/callback?code=abc&state=test-user", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200 OK got %d body=%s", w.Code, w.Body.String())
	}

	var resp TokenSaveResponse
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("invalid json response: %v", err)
	}
	if !resp.Ok || resp.UserID != "test-user" {
		t.Fatalf("unexpected response: %+v", resp)
	}

	// ensure token persisted
	if store.savedUser != "test-user" {
		t.Fatalf("expected savedUser test-user; got %q", store.savedUser)
	}
	if store.savedTok == nil || store.savedTok.AccessToken != "exchanged-access" {
		t.Fatalf("expected saved token 'exchanged-access'; got %+v", store.savedTok)
	}
}
