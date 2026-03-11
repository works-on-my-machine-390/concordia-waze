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

// GoogleOAuthHandler handles the two endpoints for the flow:
// - GET  /auth/google          -> returns {"url": "<auth-url>"} to frontend
// - GET  /auth/google/callback -> Google callback; exchanges code and saves tokens
type GoogleOAuthHandler struct {
	firebase *application.FirebaseService
}

func NewGoogleOAuthHandler(firebaseSvc *application.FirebaseService) *GoogleOAuthHandler {
	return &GoogleOAuthHandler{firebase: firebaseSvc}
}

// AuthURLResponse is returned by GetAuthURL on success.
type AuthURLResponse struct {
	URL string `json:"url"`
}

// TokenSaveResponse is returned by Callback when tokens are persisted.
type TokenSaveResponse struct {
	Ok      bool   `json:"ok"`
	UserID  string `json:"userId"`
	Message string `json:"message"`
}

// @Summary     Get Google OAuth2 authorization URL
// @Description Returns a JSON object containing the Google OAuth2 authorization URL. The frontend should redirect the user to the returned URL. The endpoint will use the authenticated user's ID (from the auth context) or an optional query parameter `userId` as a fallback to populate the OAuth `state`.
// @Tags        auth
// @Accept      json
// @Produce     json
// @Param       Authorization header string false "Bearer token" default(Bearer <token>)
// @Param       userId query string false "Optional fallback userId if not available in auth context"
// @Success     200 {object} AuthURLResponse "Authorization URL returned"
// @Failure     400 {object} map[string]string "Missing userId or invalid request"
// @Failure     500 {object} map[string]string "Server error generating URL"
// @Security    BearerAuth
// @Router      /auth/google [get]
func (h *GoogleOAuthHandler) GetAuthURL(c *gin.Context) {
	// try to find user ID from context (your auth middleware may set different keys)
	userID := c.Query("userId")
	if userID == "" {
		// try common context keys; adapt to your middleware implementation as needed
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

	authURL, err := google.GenerateAuthURL(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate auth url", "detail": err.Error()})
		return
	}
	c.JSON(http.StatusOK, AuthURLResponse{URL: authURL})
}

// @Summary     Google OAuth2 callback
// @Description Callback endpoint invoked by Google after user consent. Exchanges the authorization code for tokens and persists them on the server. The OAuth `state` parameter is expected to contain the userId (or signed state you use to identify the user). On success the handler redirects the browser to FRONTEND_AUTH_SUCCESS_URL if configured, otherwise returns a small JSON confirmation.
// @Tags        auth
// @Accept      json
// @Produce     json
// @Param       code  query string true  "Authorization code returned by Google"
// @Param       state query string true  "State value (contains userId or signed state)"
// @Success     200 {object} TokenSaveResponse "Tokens saved on server"
// @Success     302 {string} string "Redirect to configured frontend success URL"
// @Failure     400 {object} map[string]string "Missing code or state"
// @Failure     500 {object} map[string]string "Failed to exchange code or save token"
// @Router      /auth/google/callback [get]
func (h *GoogleOAuthHandler) Callback(c *gin.Context) {
	code := c.Query("code")
	state := c.Query("state") // we used userId in state
	if code == "" || state == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "missing code or state"})
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
	if err := h.firebase.SaveGoogleToken(ctx, state, tok); err != nil {
		log.Printf("failed to save google token to firebase: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to save token"})
		return
	}

	// If we wish to redirect to Calendar URL once success
	// Asked Steven, will see what he responds if he wants something of the sort.
	successURL := os.Getenv("FRONTEND_AUTH_SUCCESS_URL")
	if successURL != "" {
		c.Redirect(http.StatusFound, successURL)
		return
	}

	c.JSON(http.StatusOK, TokenSaveResponse{
		Ok:      true,
		UserID:  state,
		Message: "authorization complete and tokens saved on server",
	})
}
