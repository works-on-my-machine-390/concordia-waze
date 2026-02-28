package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
)

func TestRateLimiter_AllowsThenBlocks(t *testing.T) {
	gin.SetMode(gin.TestMode)

	// 1 token per hour, burst 1 => first request OK, next should be 429 immediately
	rl := NewIPRateLimiterEvery(time.Hour, 1)

	r := gin.New()
	r.GET("/limited", rl.Middleware(), func(c *gin.Context) {
		c.Status(http.StatusOK)
	})

	// 1st request
	w1 := httptest.NewRecorder()
	req1 := httptest.NewRequest("GET", "/limited", nil)
	// set remote addr so ClientIP() is stable
	req1.RemoteAddr = "1.2.3.4:1234"
	r.ServeHTTP(w1, req1)
	require.Equal(t, http.StatusOK, w1.Code)

	// 2nd request (same IP)
	w2 := httptest.NewRecorder()
	req2 := httptest.NewRequest("GET", "/limited", nil)
	req2.RemoteAddr = "1.2.3.4:1234"
	r.ServeHTTP(w2, req2)
	require.Equal(t, http.StatusTooManyRequests, w2.Code)
}
