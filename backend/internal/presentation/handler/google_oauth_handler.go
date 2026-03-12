package handler

import (
	"context"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/works-on-my-machine-390/concordia-waze/internal/application"
	"github.com/works-on-my-machine-390/concordia-waze/internal/application/google"
)

// GoogleOAuthHandler handles the Google OAuth flow and token status checks.
type GoogleOAuthHandler struct {
	firebase *application.FirebaseService
}

func NewGoogleOAuthHandler(firebaseSvc *application.FirebaseService) *GoogleOAuthHandler {
	return &GoogleOAuthHandler{firebase: firebaseSvc}
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
// @Description Checks stored Google tokens for the authenticated user and returns either a short-lived auth URL (when re-auth is required) or {"ok": true} when the token is usable. This endpoint MUST be called by an authenticated user (server-side JWT). The handler will use the server-side user ID from the auth context (do not rely on query userId in production).
// @Tags        auth
// @Accept      json
// @Produce     json
// @Param       Authorization header string true "Bearer token" default(Bearer <token>)
// @Param       userId query string false "Optional fallback userId if not available in auth context"
// @Success     200 {object} StatusOKResponse "Token is present and valid"
// @Success     200 {object} AuthURLResponse "No valid token; frontend should redirect user to this URL"
// @Failure     400 {object} map[string]string "Missing userId or invalid request"
// @Failure     500 {object} map[string]string "Server error checking token or generating URL"
// @Security    BearerAuth
// @Router      /auth/google [get]
func (h *GoogleOAuthHandler) GetAuthStatus(c *gin.Context) {
	// Determine userID (RequireAuth middleware should supply it in context; fallback to query param only for tests)
	userID := c.Query("userId")
	if userID == "" {
		if v, ok := c.Get("userId"); ok {
			if s, ok2 := v.(string); ok2 {
				userID = s
			}
		}
	}
	if userID == "" {
		if v, ok := c.Get("sub"); ok {
			if s, ok2 := v.(string); ok2 {
				userID = s
			}
		}
	}
	if userID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "missing userId (query or from auth context)"})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 15*time.Second)
	defer cancel()

	// 1) Load stored token
	storedTok, ok, err := h.firebase.GetGoogleToken(ctx, userID)
	if err != nil {
		log.Printf("error fetching google token for user %s: %v", userID, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to retrieve token"})
		return
	}

	// 2) No token stored => return auth url
	if !ok || storedTok == nil {
		state, _ := google.CreateStateToken(os.Getenv("JWT_SECRET"), userID, 10*time.Minute)
		authURL, err := google.GenerateAuthURL(state)
		if err != nil {
			log.Printf("failed to generate auth url: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate auth url"})
			return
		}
		c.JSON(http.StatusOK, AuthURLResponse{URL: authURL})
		return
	}

	// 3) Token present: check expiry
	// If expiry is zero value or already past, treat as expired.
	now := time.Now()
	if !storedTok.Expiry.IsZero() && storedTok.Expiry.After(now.Add(1*time.Minute)) {
		// Token still valid
		c.JSON(http.StatusOK, StatusOKResponse{Ok: true})
		return
	}

	// 4) Token expired or about to expire -> try refresh if we have a refresh token
	if storedTok.RefreshToken == "" {
		// Can't refresh; ask frontend to reauth (use signed state)
		state, _ := google.CreateStateToken(os.Getenv("JWT_SECRET"), userID, 10*time.Minute)
		authURL, err := google.GenerateAuthURL(state)
		if err != nil {
			log.Printf("failed to generate auth url (no refresh token): %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate auth url"})
			return
		}
		c.JSON(http.StatusOK, AuthURLResponse{URL: authURL})
		return
	}

	// 5) Attempt refresh via TokenSource
	cfg, err := google.Config()
	if err != nil {
		log.Printf("failed to build oauth2 config: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "server misconfiguration"})
		return
	}

	// Use TokenSource to attempt a refresh. TokenSource.Token() will refresh if expired.
	ts := cfg.TokenSource(ctx, storedTok)
	newTok, err := ts.Token()
	if err != nil {
		// Refresh failed -> require reauth (use signed state)
		log.Printf("token refresh failed for user %s: %v", userID, err)
		state, _ := google.CreateStateToken(os.Getenv("JWT_SECRET"), userID, 10*time.Minute)
		authURL, aerr := google.GenerateAuthURL(state)
		if aerr != nil {
			log.Printf("failed to generate auth url after refresh failure: %v", aerr)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate auth url"})
			return
		}
		c.JSON(http.StatusOK, AuthURLResponse{URL: authURL})
		return
	}

	// 6) Persist refreshed token (best-effort)
	if err := h.firebase.SaveGoogleToken(ctx, userID, newTok); err != nil {
		// log but still return ok — user can continue; persistence failure should be investigated.
		log.Printf("warning: failed to persist refreshed token for user %s: %v", userID, err)
	}

	// Success
	c.JSON(http.StatusOK, StatusOKResponse{Ok: true})
}

// Callback handles Google's redirect, exchanges code for tokens and saves them on the server.
//
// The OAuth `state` parameter is expected to be a short-lived signed token generated by the backend
// (contains userID and expiry). The callback validates that state to recover the userID and then
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

	// Save token using your existing FirebaseService.
	if err := h.firebase.SaveGoogleToken(ctx, userID, tok); err != nil {
		log.Printf("failed to save google token to firebase: %v", err)
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
