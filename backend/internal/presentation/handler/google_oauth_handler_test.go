package handler

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"os"
	"reflect"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/works-on-my-machine-390/concordia-waze/internal/application/google"
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

type fakeStoreSaveError struct {
	token     *oauth2.Token
	ok        bool
	savedUser string
	savedTok  *oauth2.Token
}

func (f *fakeStoreSaveError) GetGoogleToken(ctx context.Context, userID string) (*oauth2.Token, bool, error) {
	return f.token, f.ok, nil
}

func (f *fakeStoreSaveError) SaveGoogleToken(ctx context.Context, userID string, token *oauth2.Token) error {
	f.savedUser = userID
	f.savedTok = token
	return errors.New("db failure")
}

// helper to set required env for GenerateAuthURL and CreateStateToken
func setGoogleEnv(t *testing.T) func() {
	t.Helper()
	origClientID := os.Getenv("GOOGLE_CLIENT_ID")
	origClientSecret := os.Getenv("GOOGLE_CLIENT_SECRET")
	origRedirect := os.Getenv("GOOGLE_REDIRECT_URL")
	origJWT := os.Getenv("JWT_SECRET")

	_ = os.Setenv("GOOGLE_CLIENT_ID", "dummy-client-id")
	_ = os.Setenv("GOOGLE_CLIENT_SECRET", "dummy-client-secret")
	_ = os.Setenv("GOOGLE_REDIRECT_URL", "http://localhost/auth/google/callback")
	_ = os.Setenv("JWT_SECRET", "test-secret")

	return func() {
		_ = os.Setenv("GOOGLE_CLIENT_ID", origClientID)
		_ = os.Setenv("GOOGLE_CLIENT_SECRET", origClientSecret)
		_ = os.Setenv("GOOGLE_REDIRECT_URL", origRedirect)
		_ = os.Setenv("JWT_SECRET", origJWT)
	}
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

func TestGetAuthStatus_NoTokenStored_ReturnsURL(t *testing.T) {
	teardown := setGoogleEnv(t)
	defer teardown()

	store := &fakeStore{token: nil, ok: false}
	h := NewGoogleOAuthHandlerWithDeps(store, fakeTSProvider{}, fakeParseState, fakeExchangeCode)
	router := setupRouterWithHandler(h)

	req := httptest.NewRequest(http.MethodGet, "/auth/google/status?userId=no-token", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200 OK got %d body=%s", w.Code, w.Body.String())
	}
	var resp map[string]string
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("invalid json: %v", err)
	}
	if resp["url"] == "" {
		t.Fatalf("expected url in response, got: %v", resp)
	}
}

func TestGetAuthStatus_NoRefreshToken_ReturnsURL(t *testing.T) {
	teardown := setGoogleEnv(t)
	defer teardown()

	// token expired and missing refresh token
	expired := &oauth2.Token{AccessToken: "a", RefreshToken: "", Expiry: time.Now().Add(-1 * time.Hour)}
	store := &fakeStore{token: expired, ok: true}

	h := NewGoogleOAuthHandlerWithDeps(store, fakeTSProvider{}, fakeParseState, fakeExchangeCode)
	router := setupRouterWithHandler(h)

	req := httptest.NewRequest(http.MethodGet, "/auth/google/status?userId=no-rt", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200 OK got %d body=%s", w.Code, w.Body.String())
	}
	var resp map[string]string
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("invalid json: %v", err)
	}
	if resp["url"] == "" {
		t.Fatalf("expected url in response, got: %v", resp)
	}
}

func TestGetAuthStatus_RefreshFails_ReturnsURL(t *testing.T) {
	teardown := setGoogleEnv(t)
	defer teardown()

	// expired token but has refresh token
	expired := &oauth2.Token{AccessToken: "old", RefreshToken: "rt", Expiry: time.Now().Add(-1 * time.Hour)}
	store := &fakeStore{token: expired, ok: true}

	// TokenSource that returns error on Token()
	tsProv := fakeTSProvider{ts: fakeTokenSource{ret: nil, err: errors.New("refresh failed")}}

	h := NewGoogleOAuthHandlerWithDeps(store, tsProv, fakeParseState, fakeExchangeCode)
	router := setupRouterWithHandler(h)

	req := httptest.NewRequest(http.MethodGet, "/auth/google/status?userId=refresh-fail", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200 OK got %d body=%s", w.Code, w.Body.String())
	}
	var resp map[string]string
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("invalid json: %v", err)
	}
	if resp["url"] == "" {
		t.Fatalf("expected url in response, got: %v", resp)
	}
}

func TestGetAuthStatus_RefreshSucceeds_PersistError_StillOk(t *testing.T) {
	teardown := setGoogleEnv(t)
	defer teardown()

	// expired token but has refresh token
	expired := &oauth2.Token{AccessToken: "old", RefreshToken: "rt", Expiry: time.Now().Add(-1 * time.Hour)}
	store := &fakeStoreSaveError{token: expired, ok: true}

	// TokenSource returns refreshed token
	newTok := &oauth2.Token{AccessToken: "new", RefreshToken: "new-rt", Expiry: time.Now().Add(1 * time.Hour)}
	tsProv := fakeTSProvider{ts: fakeTokenSource{ret: newTok, err: nil}}

	h := NewGoogleOAuthHandlerWithDeps(store, tsProv, fakeParseState, fakeExchangeCode)
	router := setupRouterWithHandler(h)

	req := httptest.NewRequest(http.MethodGet, "/auth/google/status?userId=persist-err", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200 OK got %d body=%s", w.Code, w.Body.String())
	}
	var resp map[string]bool
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("invalid json: %v", err)
	}
	if ok, exists := resp["ok"]; !exists || !ok {
		t.Fatalf("expected {\"ok\": true}, got %v", resp)
	}
	// ensure Save was attempted (savedUser set even though Save returned error)
	if store.savedUser != "persist-err" {
		t.Fatalf("expected Save called for user, got %q", store.savedUser)
	}
}

// Callback tests

func TestCallback_InvalidState_Returns400(t *testing.T) {
	store := &fakeStore{}
	// parse state returns error
	parseErr := func(secret, tok string) (string, error) { return "", errors.New("bad state") }
	h := NewGoogleOAuthHandlerWithDeps(store, fakeTSProvider{}, parseErr, fakeExchangeCode)
	router := setupRouterWithHandler(h)

	req := httptest.NewRequest(http.MethodGet, "/auth/google/callback?code=abc&state=bad", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected 400 BadRequest got %d body=%s", w.Code, w.Body.String())
	}
}

func TestCallback_ExchangeFails_Returns500(t *testing.T) {
	store := &fakeStore{}
	// exchange returns error
	exchErr := func(ctx context.Context, code string) (*oauth2.Token, error) {
		return nil, errors.New("exchange failed")
	}
	h := NewGoogleOAuthHandlerWithDeps(store, fakeTSProvider{}, fakeParseState, exchErr)
	router := setupRouterWithHandler(h)

	req := httptest.NewRequest(http.MethodGet, "/auth/google/callback?code=abc&state=test-user", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusInternalServerError {
		t.Fatalf("expected 500 InternalServerError got %d body=%s", w.Code, w.Body.String())
	}
}

func TestCallback_SaveTokenFails_Returns500(t *testing.T) {
	// parse ok, exchange returns token, but Save returns error
	store := &fakeStoreSaveError{}
	h := NewGoogleOAuthHandlerWithDeps(store, fakeTSProvider{}, fakeParseState, fakeExchangeCode)
	router := setupRouterWithHandler(h)

	req := httptest.NewRequest(http.MethodGet, "/auth/google/callback?code=abc&state=test-user", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusInternalServerError {
		t.Fatalf("expected 500 InternalServerError got %d body=%s", w.Code, w.Body.String())
	}
}

func TestCallback_SuccessRedirectsWhenEnvSet(t *testing.T) {
	store := &fakeStore{}
	h := NewGoogleOAuthHandlerWithDeps(store, fakeTSProvider{}, fakeParseState, fakeExchangeCode)
	router := setupRouterWithHandler(h)

	_ = os.Setenv("FRONTEND_AUTH_SUCCESS_URL", "http://example.test/success")
	defer os.Unsetenv("FRONTEND_AUTH_SUCCESS_URL")

	req := httptest.NewRequest(http.MethodGet, "/auth/google/callback?code=abc&state=test-user", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusFound {
		t.Fatalf("expected 302 Found got %d body=%s", w.Code, w.Body.String())
	}
}

// Test that oauth2TokenSourceProvider returns a TokenSource that returns an error
// when google.Config() cannot be built (covers errorTokenSource path).
func Test_oauth2TokenSourceProvider_ConfigErrorProducesErrorTokenSource(t *testing.T) {
	// Ensure GOOGLE env is unset so google.Config() fails
	origClient := os.Getenv("GOOGLE_CLIENT_ID")
	origSecret := os.Getenv("GOOGLE_CLIENT_SECRET")
	origRedirect := os.Getenv("GOOGLE_REDIRECT_URL")
	_ = os.Unsetenv("GOOGLE_CLIENT_ID")
	_ = os.Unsetenv("GOOGLE_CLIENT_SECRET")
	_ = os.Unsetenv("GOOGLE_REDIRECT_URL")
	defer func() {
		_ = os.Setenv("GOOGLE_CLIENT_ID", origClient)
		_ = os.Setenv("GOOGLE_CLIENT_SECRET", origSecret)
		_ = os.Setenv("GOOGLE_REDIRECT_URL", origRedirect)
	}()

	p := oauth2TokenSourceProvider{}
	ts := p.TokenSource(context.Background(), &oauth2.Token{})
	if ts == nil {
		t.Fatalf("expected a TokenSource, got nil")
	}
	_, err := ts.Token()
	if err == nil {
		t.Fatalf("expected Token() to return an error when google.Config() fails")
	}
}

// Test NewGoogleOAuthHandlerWithDeps sets defaults when nil values passed
func Test_NewGoogleOAuthHandlerWithDeps_SetsDefaults(t *testing.T) {
	store := &fakeStore{}
	h := NewGoogleOAuthHandlerWithDeps(store, nil, nil, nil)

	// reflect to access unexported fields (same package)
	v := reflect.ValueOf(h).Elem()
	if v.FieldByName("tsProvider").IsNil() {
		t.Fatalf("expected tsProvider default to be set")
	}
	if v.FieldByName("parseState").IsNil() {
		t.Fatalf("expected parseState default to be set")
	}
	if v.FieldByName("exchangeCode").IsNil() {
		t.Fatalf("expected exchangeCode default to be set")
	}
}

// Test Callback fallback to google.ParseStateToken when h.parseState is nil.
// We construct handler manually with parseState == nil so Callback's runtime
// fallback is exercised. Use fakeExchangeCode so no network call occurs.
func Test_Callback_ParseFallbackWhenParseStateNil(t *testing.T) {
	// set JWT_SECRET so we can create a valid signed state token
	origJWT := os.Getenv("JWT_SECRET")
	_ = os.Setenv("JWT_SECRET", "test-secret")
	defer func() { _ = os.Setenv("JWT_SECRET", origJWT) }()

	// create a signed state token that google.ParseStateToken will accept
	state, err := google.CreateStateToken(os.Getenv("JWT_SECRET"), "fallback-user", 5*time.Minute)
	if err != nil {
		t.Fatalf("failed to create state token: %v", err)
	}

	store := &fakeStore{}
	// construct handler with parseState == nil to force fallback, and use a fake exchange func
	h := &GoogleOAuthHandler{
		store:        store,
		parseState:   nil, // ensure Callback uses fallback path
		exchangeCode: fakeExchangeCode,
		stateTTL:     10 * time.Minute,
	}

	router := setupRouterWithHandler(h)

	req := httptest.NewRequest(http.MethodGet, "/auth/google/callback?code=dummy&state="+state, nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200 OK got %d body=%s", w.Code, w.Body.String())
	}

	// verify SaveGoogleToken was called with user from the parsed state
	if store.savedUser != "fallback-user" {
		t.Fatalf("expected savedUser 'fallback-user', got %q", store.savedUser)
	}
	if store.savedTok == nil || store.savedTok.AccessToken != "exchanged-access" {
		t.Fatalf("expected saved token 'exchanged-access', got %+v", store.savedTok)
	}
}

// extractUserID tests: make sure context keys "userId" and "sub" are recognized.
func Test_extractUserID_ContextKeys(t *testing.T) {
	gin.SetMode(gin.TestMode)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)

	// 1) userId key
	c.Set("userId", "u1")
	if got := extractUserID(c); got != "u1" {
		t.Fatalf("expected extractUserID to return 'u1', got %q", got)
	}

	// 2) sub key
	c2, _ := gin.CreateTestContext(w)
	c2.Set("sub", "sub1")
	if got := extractUserID(c2); got != "sub1" {
		t.Fatalf("expected extractUserID to return 'sub1', got %q", got)
	}

	// 3) no keys -> empty
	c3, _ := gin.CreateTestContext(w)
	if got := extractUserID(c3); got != "" {
		t.Fatalf("expected extractUserID to return empty, got %q", got)
	}
}

// Ensure the makeAuthURL error branch can be exercised: create a handler with an invalid JWT_SECRET
// and call makeAuthURL directly to see the CreateStateToken error path (this demonstrates coverage
// of the makeAuthURL -> CreateStateToken error branch).
func Test_makeAuthURL_CreateStateError(t *testing.T) {
	// unset JWT_SECRET to cause CreateStateToken to error if it relies on a secret presence.
	orig := os.Getenv("JWT_SECRET")
	_ = os.Unsetenv("JWT_SECRET")
	defer func() { _ = os.Setenv("JWT_SECRET", orig) }()

	h := &GoogleOAuthHandler{
		stateTTL: 10 * time.Minute,
	}

	_, err := h.makeAuthURL("user-x")
	if err == nil {
		t.Fatalf("expected makeAuthURL to return error when JWT_SECRET missing")
	}
}

// simple helper to unmarshal JSON responses used across tests
func mustUnmarshal(t *testing.T, body []byte, out interface{}) {
	t.Helper()
	if err := json.Unmarshal(body, out); err != nil {
		t.Fatalf("failed to unmarshal response: %v; body=%s", err, string(body))
	}
}
