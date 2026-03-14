package handler

import (
	"context"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/gin-gonic/gin"
	"golang.org/x/oauth2"

	"github.com/works-on-my-machine-390/concordia-waze/internal/application/google"
)

// GoogleTokenStore is the minimal interface this handler needs from a token store.
type GoogleTokenStore interface {
	GetGoogleToken(ctx context.Context, userID string) (*oauth2.Token, bool, error)
	SaveGoogleToken(ctx context.Context, userID string, token *oauth2.Token) error
}

// TokenSourceProvider abstracts creation of an oauth2.TokenSource for a stored token.
type TokenSourceProvider interface {
	TokenSource(ctx context.Context, t *oauth2.Token) oauth2.TokenSource
}

// StateParser parses and validates the state token and returns the userID embedded.
type StateParser func(secret, token string) (string, error)

// CodeExchanger exchanges an authorization code for an oauth2.Token.
type CodeExchanger func(ctx context.Context, code string) (*oauth2.Token, error)

// GoogleOAuthHandler handles the Google OAuth flow and token status checks.
type GoogleOAuthHandler struct {
	store        GoogleTokenStore
	tsProvider   TokenSourceProvider
	parseState   StateParser
	exchangeCode CodeExchanger
	stateTTL     time.Duration
}

func NewGoogleOAuthHandlerWithDeps(store GoogleTokenStore, tsProvider TokenSourceProvider, parse StateParser, exchange CodeExchanger) *GoogleOAuthHandler {
	h := &GoogleOAuthHandler{
		store:        store,
		tsProvider:   tsProvider,
		parseState:   parse,
		exchangeCode: exchange,
		stateTTL:     10 * time.Minute,
	}
	// Provide sensible defaults when nil (use real google package functions).
	if h.tsProvider == nil {
		h.tsProvider = oauth2TokenSourceProvider{}
	}
	if h.parseState == nil {
		h.parseState = func(secret, token string) (string, error) {
			return google.ParseStateToken(secret, token)
		}
	}
	if h.exchangeCode == nil {
		h.exchangeCode = func(ctx context.Context, code string) (*oauth2.Token, error) {
			return google.ExchangeCode(ctx, code)
		}
	}
	return h
}

// Default constructor using the production google helpers.
func NewGoogleOAuthHandler(store GoogleTokenStore) *GoogleOAuthHandler {
	return NewGoogleOAuthHandlerWithDeps(store, nil, nil, nil)
}

// small default provider that delegates to google.Config().TokenSource(...)
type oauth2TokenSourceProvider struct{}

func (oauth2TokenSourceProvider) TokenSource(ctx context.Context, t *oauth2.Token) oauth2.TokenSource {
	cfg, err := google.Config()
	if err != nil {
		// If config can't be built, return a TokenSource that always errors.
		return oauth2.ReuseTokenSource(nil, errorTokenSource{err: err})
	}
	return cfg.TokenSource(ctx, t)
}

// errorTokenSource returns the error on Token()
type errorTokenSource struct{ err error }

func (e errorTokenSource) Token() (*oauth2.Token, error) { return nil, e.err }

// Response types
type AuthURLResponse struct {
	URL string `json:"url"`
}
type StatusOKResponse struct {
	Ok bool `json:"ok"`
}
type TokenSaveResponse struct {
	Ok      bool   `json:"ok"`
	UserID  string `json:"userId"`
	Message string `json:"message"`
}

func (h *GoogleOAuthHandler) makeAuthURL(userID string) (string, error) {
	state, err := google.CreateStateToken(os.Getenv("JWT_SECRET"), userID, h.stateTTL)
	if err != nil {
		return "", err
	}
	return google.GenerateAuthURL(state)
}

// extractUserID obtains the user identifier from Gin context or query
func extractUserID(c *gin.Context) string {
	// 1) common middleware key
	if v, ok := c.Get("userId"); ok {
		if s, ok2 := v.(string); ok2 && s != "" {
			return s
		}
	}

	// 2) JWT 'sub' claim (some middlewares set this)
	if v, ok := c.Get("sub"); ok {
		if s, ok2 := v.(string); ok2 && s != "" {
			return s
		}
	}

	// 3) query fallback for tests / backwards compatibility only
	if q := c.Query("userId"); q != "" {
		return q
	}

	return ""
}

// @Summary     Get Google OAuth2 status / auth URL
// @Description Checks stored Google tokens for the authenticated user and returns either a short-lived auth URL (when re-auth is required) or {"ok": true} when the token is usable. This endpoint SHOULD be called by an authenticated user (server-side JWT). The handler will use the server-side user ID from the auth context (do not rely on query userId in production).
// @Tags        auth
// @Accept      json
// @Produce     json
// @Param       userId query string false "Optional fallback userId if not available in auth context"
// @Param       Authorization header string true "Bearer token" default(Bearer <token>)
// @Success     200 {object} StatusOKResponse "Token is present and valid"
// @Success     200 {object} AuthURLResponse "No valid token; frontend should redirect user to this URL"
// @Failure     400 {object} map[string]string "Missing userId or invalid request"
// @Failure     500 {object} map[string]string "Server error checking token or generating URL"
// @Security    BearerAuth
// @Router      /auth/google [get]
func (h *GoogleOAuthHandler) GetAuthStatus(c *gin.Context) {
	userID := extractUserID(c)
	if userID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "missing userId (query or from auth context)"})
		return
	}
	ctx, cancel := context.WithTimeout(c.Request.Context(), 15*time.Second)
	defer cancel()

	needsAuth, authURL, err := h.checkAndRefreshIfNeeded(ctx, userID)
	if err != nil {
		log.Printf("error checking auth status : %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to check auth status"})
		return
	}

	if needsAuth {
		c.JSON(http.StatusOK, AuthURLResponse{URL: authURL})
		return
	}

	c.JSON(http.StatusOK, StatusOKResponse{Ok: true})
}

// checkAndRefreshIfNeeded loads the stored token and returns:
// - needsAuth=true and authURL set when the frontend must initiate auth
// - needsAuth=false when token is valid (or refreshed successfully)
// - non-nil error on internal failure
func (h *GoogleOAuthHandler) checkAndRefreshIfNeeded(ctx context.Context, userID string) (needsAuth bool, authURL string, retErr error) {
	storedTok, ok, err := h.store.GetGoogleToken(ctx, userID)
	if err != nil {
		return false, "", err
	}

	// No token -> ask frontend to auth
	if !ok || storedTok == nil {
		aURL, gerr := h.makeAuthURL(userID)
		if gerr != nil {
			return false, "", gerr
		}
		return true, aURL, nil
	}

	// Token present and not near expiry -> OK
	if tokenValid(storedTok) {
		return false, "", nil
	}

	// No refresh token -> needs auth
	if storedTok.RefreshToken == "" {
		aURL, gerr := h.makeAuthURL(userID)
		if gerr != nil {
			return false, "", gerr
		}
		return true, aURL, nil
	}

	// Attempt refresh using injected TokenSourceProvider (preferred) or google.Config() fallback.
	ts, err := h.buildTokenSource(ctx, storedTok)
	if err != nil {
		return false, "", err
	}

	newTok, err := ts.Token()
	if err != nil {
		// refresh failed -> require reauth
		aURL, gerr := h.makeAuthURL(userID)
		if gerr != nil {
			return false, "", gerr
		}
		return true, aURL, nil
	}

	// Persist refreshed token (best-effort). On persist error, return success to caller (user can continue).
	err = h.store.SaveGoogleToken(ctx, userID, newTok)
	if err != nil {
		log.Printf("warning: failed to persist refreshed token : %v", err)
	}
	return false, "", nil
}

// buildTokenSource returns a TokenSource using the injected provider when present,
// otherwise falls back to google.Config().TokenSource.
func (h *GoogleOAuthHandler) buildTokenSource(ctx context.Context, t *oauth2.Token) (oauth2.TokenSource, error) {
	if h.tsProvider != nil {
		return h.tsProvider.TokenSource(ctx, t), nil
	}
	cfg, err := google.Config()
	if err != nil {
		return nil, err
	}
	return cfg.TokenSource(ctx, t), nil
}

func tokenValid(tok *oauth2.Token) bool {
	if tok == nil {
		return false
	}
	if tok.Expiry.IsZero() {
		return false
	}
	return tok.Expiry.After(time.Now().Add(1 * time.Minute))
}

// Callback handler: uses injected parseState and exchangeCode
//
// @Summary     Google OAuth2 callback
// @Description Callback endpoint invoked by Google after user consent. Exchanges the authorization code for tokens and persists them on the server. The `state` parameter must be a signed short-lived token previously returned to the frontend by GetAuthStatus (contains the userId). This endpoint is public (called by Google) and must validate the signed state.
// @Tags        auth
// @Accept      json
// @Produce     json
// @Param       code  query string true  "Authorization code returned by Google"
// @Param       state query string true  "Signed state token issued by backend (contains userId and short expiry)"
// @Success     200 {object} TokenSaveResponse "Tokens saved on server"
// @Success     302 {string} string "Redirect to configured frontend success URL"
// @Failure     400 {object} map[string]string "Missing or invalid code/state"
// @Failure     500 {object} map[string]string "Failed to exchange code or save token"
// @Router      /auth/google/callback [get]
func (h *GoogleOAuthHandler) Callback(c *gin.Context) {
	code := c.Query("code")
	state := c.Query("state")
	if code == "" || state == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "missing code or state"})
		return
	}

	// Validate and parse the signed state token to obtain userID.
	// Call the injected parser only if non-nil; otherwise fall back to google.ParseStateToken.
	var userID string
	var serr error
	if h.parseState != nil {
		userID, serr = h.parseState(os.Getenv("JWT_SECRET"), state)
	} else {
		userID, serr = google.ParseStateToken(os.Getenv("JWT_SECRET"), state)
	}

	if serr != nil || userID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid or expired state token"})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	var tok *oauth2.Token
	var err error
	if h.exchangeCode != nil {
		tok, err = h.exchangeCode(ctx, code)
	} else {
		tok, err = google.ExchangeCode(ctx, code)
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to exchange code", "detail": err.Error()})
		return
	}

	// Save token using the injected token store.
	err = h.store.SaveGoogleToken(ctx, userID, tok)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to save token"})
		return
	}

	// On success redirect to configured frontend URL or return JSON
	successURL := os.Getenv("FRONTEND_AUTH_SUCCESS_URL")
	if successURL != "" {
		c.Redirect(http.StatusFound, successURL)
		return
	}

	c.JSON(http.StatusOK, TokenSaveResponse{
		Ok:      true,
		UserID:  userID,
		Message: "authorization complete and tokens saved on server",
	})
}
