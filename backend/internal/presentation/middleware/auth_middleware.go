package middleware

import (
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/works-on-my-machine-390/concordia-waze/internal/application"
	"github.com/works-on-my-machine-390/concordia-waze/internal/domain"
)

// AuthMiddleware validates JWT tokens and sets user context
func AuthMiddleware(jwtManager *application.JWTManager) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Extract token from Authorization header
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			// Token is optional - user can be nil
			c.Set("user", nil)
			c.Next()
			return
		}

		// Expected format: "Bearer <token>"
		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || parts[0] != "Bearer" {
			c.JSON(401, gin.H{"error": "invalid authorization header format"})
			c.Abort()
			return
		}

		tokenString := parts[1]

		// Validate token
		claims, err := jwtManager.ValidateToken(tokenString)
		if err != nil {
			if err == domain.ErrInvalidToken {
				c.JSON(401, gin.H{"error": "invalid or expired token"})
			} else {
				c.JSON(401, gin.H{"error": err.Error()})
			}
			c.Abort()
			return
		}

		// Extract expiration time from token
		jwtClaims := jwt.MapClaims{}
		jwt.ParseWithClaims(tokenString, jwtClaims, func(token *jwt.Token) (interface{}, error) {
			return []byte(""), nil
		})

		var expTime time.Time
		if exp, ok := jwtClaims["exp"].(float64); ok {
			expTime = time.Unix(int64(exp), 0)
		}

		// Set user and token expiration in context
		c.Set("user", claims)
		c.Set("token_exp", expTime)
		c.Next()
	}
}

// RequireAuth is a middleware that requires authentication
func RequireAuth() gin.HandlerFunc {
	return func(c *gin.Context) {
		user, exists := c.Get("user")
		if !exists || user == nil {
			c.JSON(401, gin.H{"error": "authentication required"})
			c.Abort()
			return
		}
		c.Next()
	}
}

// GetUserFromContext extracts the authenticated user from context
func GetUserFromContext(c *gin.Context) *domain.UserClaims {
	user, exists := c.Get("user")
	if !exists {
		return nil
	}

	claims, ok := user.(*domain.UserClaims)
	if !ok {
		return nil
	}

	return claims
}
