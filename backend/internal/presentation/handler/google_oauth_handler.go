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

const authUrlGenerationError = "failed to generate auth url"

// GoogleTokenStore is the minimal interface this handler needs from a token store.
// Your application.FirebaseService already implements these methods.
type GoogleTokenStore interface {
	GetGoogleToken(ctx context.Context, userID string) (*oauth2.Token, bool, error)
	SaveGoogleToken(ctx context.Context, userID string, token *oauth2.Token) error
}

// GoogleOAuthHandler handles the Google OAuth flow and token status checks.
type GoogleOAuthHandler struct {
	store GoogleTokenStore
}

func NewGoogleOAuthHandler(store GoogleTokenStore) *GoogleOAuthHandler {
	return &GoogleOAuthHandler{store: store}
}

// AuthURLResponse is returned when the backend requests the frontend to start OAuth.
type AuthURLResponse struct {
	URL string `json:"url"`
}

// StatusOKResponse is returned when the stored token is present and usable.
type StatusOKResponse struct {
	Ok bool `json:"ok"`
}

// TokenSaveResponse is returned by Callback when tokens are persisted.
type TokenSaveResponse struct {
	Ok      bool   `json:"ok"`
	UserID  string `json:"userId"`
	Message string `json:"message"`
}

// GetAuthStatus checks whether the user already has a valid Google token.
//
// Behavior:
//   - If no token stored -> returns {"url":"<authUrl>"} (frontend should redirect user).
//   - If token present and not expired -> returns {"ok": true}.
//   - If token expired and has refresh_token -> attempts to refresh; on success persists new token and returns {"ok": true}.
//   - If token expired and no refresh_token or refresh fails -> returns {"url":"<authUrl>"}.
//
// @Summary     Get Google OAuth2 status / auth URL
// @Description Checks stored Google tokens for the authenticated user and returns either a short-lived auth URL (when re-auth is required) or {"ok": true} when the token is usable. This endpoint SHOULD be called by an authenticated user (server-side JWT). The handler will use the server-side user ID from the auth context (do not rely on query userId in production).
// @Tags        auth
// @Accept      json
// @Produce     json
// @Param       Authorization header string true "Bearer token" default(Bearer <token>)
// @Success     200 {object} StatusOKResponse "Token is present and valid"
// @Success     200 {object} AuthURLResponse "No valid token; frontend should redirect user to this URL"
// @Failure     400 {object} map[string]string "Missing userId or invalid request"
// @Failure     500 {object} map[string]string "Server error checking token or generating URL"
// @Security    BearerAuth
// @Router      /auth/google/status [get]
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
		log.Printf("error checking auth status for user %s: %v", userID, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to check auth status"})
		return
	}

	if needsAuth {
		c.JSON(http.StatusOK, AuthURLResponse{URL: authURL})
		return
	}

	c.JSON(http.StatusOK, StatusOKResponse{Ok: true})
}

// extractUserID obtains the user identifier from Gin context or query (query only for test/backwards compatibility).
func extractUserID(c *gin.Context) string {
	if v := c.Query("userId"); v != "" {
		return v
	}
	if v, ok := c.Get("userId"); ok {
		if s, ok2 := v.(string); ok2 && s != "" {
			return s
		}
	}
	if v, ok := c.Get("sub"); ok {
		if s, ok2 := v.(string); ok2 && s != "" {
			return s
		}
	}
	return ""
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
		aURL, gerr := makeAuthURL(userID)
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
		aURL, gerr := makeAuthURL(userID)
		if gerr != nil {
			return false, "", gerr
		}
		return true, aURL, nil
	}

	// Try to refresh
	cfg, err := google.Config()
	if err != nil {
		return false, "", err
	}

	ts := cfg.TokenSource(ctx, storedTok)
	newTok, err := ts.Token()
	if err != nil {
		// refresh failed -> require reauth
		aURL, gerr := makeAuthURL(userID)
		if gerr != nil {
			return false, "", gerr
		}
		return true, aURL, nil
	}

	// Persist refreshed token (best-effort). On persist error, return success to caller (user can continue).
	if err := h.store.SaveGoogleToken(ctx, userID, newTok); err != nil {
		log.Printf("warning: failed to persist refreshed token for user %s: %v", userID, err)
	}

	return false, "", nil
}

// tokenValid returns true when token is non-nil and not expiring within 1 minute.
func tokenValid(tok *oauth2.Token) bool {
	if tok == nil {
		return false
	}
	// If Expiry is zero, treat as invalid (we prefer explicit expiry).
	if tok.Expiry.IsZero() {
		return false
	}
	return tok.Expiry.After(time.Now().Add(1 * time.Minute))
}

// makeAuthURL creates a signed state and generates the Google auth URL.
func makeAuthURL(userID string) (string, error) {
	state, err := google.CreateStateToken(os.Getenv("JWT_SECRET"), userID, 10*time.Minute)
	if err != nil {
		return "", err
	}
	authURL, err := google.GenerateAuthURL(state)
	if err != nil {
		return "", err
	}
	return authURL, nil
}

// Callback handles Google's redirect, exchanges code for tokens and saves them on the server.
//
// The OAuth `state` parameter is expected to be a short-lived signed token generated by the backend
// (contains userID and expiry). The callback validates that state to obtain the userID and then
// stores the returned token under that user.
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

	// Validate and parse the signed state token to obtain userID
	userID, serr := google.ParseStateToken(os.Getenv("JWT_SECRET"), state)
	if serr != nil || userID == "" {
		log.Printf("invalid or expired oauth state token: %v", serr)
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid or expired state token"})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	tok, err := google.ExchangeCode(ctx, code)
	if err != nil {
		log.Printf("google oauth exchange error: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to exchange code", "detail": err.Error()})
		return
	}

	// Save token using the injected token store.
	if err := h.store.SaveGoogleToken(ctx, userID, tok); err != nil {
		log.Printf("failed to save google token: %v", err)
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
