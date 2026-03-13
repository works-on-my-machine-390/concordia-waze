package google

import (
	"context"
	"errors"
	"os"
	"time"

	"github.com/golang-jwt/jwt/v4"
	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
)

const CalendarScope = "https://www.googleapis.com/auth/calendar"

/*
Environment variables used:
- GOOGLE_CLIENT_ID
- GOOGLE_CLIENT_SECRET
- GOOGLE_REDIRECT_URL (matches URI configured in google cloud console)
*/
func oauthConfigFromEnv() (*oauth2.Config, error) {
	clientID := os.Getenv("GOOGLE_CLIENT_ID")
	clientSecret := os.Getenv("GOOGLE_CLIENT_SECRET")
	redirectURL := os.Getenv("GOOGLE_REDIRECT_URL")

	if clientID == "" || clientSecret == "" || redirectURL == "" {
		return nil, errors.New("missing GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET or GOOGLE_REDIRECT_URL environment variables")
	}

	cfg := &oauth2.Config{
		ClientID:     clientID,
		ClientSecret: clientSecret,
		RedirectURL:  redirectURL,
		Scopes:       []string{CalendarScope},
		Endpoint:     google.Endpoint,
	}
	return cfg, nil
}

// Returns an OAuth2 authorization URL
// state should be a value the frontend/backend can use to identify the user (e.g. userID)
func GenerateAuthURL(state string) (string, error) {
	cfg, err := oauthConfigFromEnv()
	if err != nil {
		return "", err
	}
	// Offline to request a refresh token
	// prompt=consent to force refresh_token if necessary
	url := cfg.AuthCodeURL(state,
		oauth2.AccessTypeOffline,
		oauth2.SetAuthURLParam("prompt", "consent"),
	)
	return url, nil
}

// ExchangeCode exchanges the code returned by Google for an oauth2.Token.
func ExchangeCode(ctx context.Context, code string) (*oauth2.Token, error) {
	cfg, err := oauthConfigFromEnv()
	if err != nil {
		return nil, err
	}
	tok, err := cfg.Exchange(ctx, code)
	if err != nil {
		return nil, err
	}
	return tok, nil
}

func CreateStateToken(secret, userID string, ttl time.Duration) (string, error) {
	claims := jwt.RegisteredClaims{
		Subject:   userID,
		ExpiresAt: jwt.NewNumericDate(time.Now().Add(ttl)),
		IssuedAt:  jwt.NewNumericDate(time.Now()),
	}
	tok := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return tok.SignedString([]byte(secret))
}

func ParseStateToken(secret, tokenStr string) (string, error) {
	tok, err := jwt.ParseWithClaims(tokenStr, &jwt.RegisteredClaims{}, func(token *jwt.Token) (interface{}, error) {
		return []byte(secret), nil
	})
	if err != nil {
		return "", err
	}
	if claims, ok := tok.Claims.(*jwt.RegisteredClaims); ok && tok.Valid {
		return claims.Subject, nil
	}
	return "", jwt.ErrTokenInvalidClaims
}
