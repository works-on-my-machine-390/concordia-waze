package middleware

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// ValidateUserOwnership ensures that the authenticated user can only access their own resources
// It compares the userID from the JWT claims with the userID in the URL parameter
func ValidateUserOwnership() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Get authenticated user from context (set by AuthMiddleware)
		userClaims := GetUserFromContext(c)
		if userClaims == nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
			c.Abort()
			return
		}

		// Get user ID from URL parameter
		requestedUserID := c.Param("userId")
		if requestedUserID == "" {
			// If no userId param, allow request to proceed (for non-user-specific endpoints)
			c.Next()
			return
		}

		// Verify that the authenticated user matches the requested resource owner
		if userClaims.ID != requestedUserID {
			c.JSON(http.StatusForbidden, gin.H{"error": "Access denied: You can only access your own resources"})
			c.Abort()
			return
		}

		c.Next()
	}
}
