package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
	"golang.org/x/time/rate"
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

func TestRateLimiter_DifferentIPsHaveIndependentLimits(t *testing.T) {
	gin.SetMode(gin.TestMode)

	rl := NewIPRateLimiterEvery(time.Hour, 1)

	r := gin.New()
	r.GET("/limited", rl.Middleware(), func(c *gin.Context) {
		c.Status(http.StatusOK)
	})

	w1 := httptest.NewRecorder()
	req1 := httptest.NewRequest("GET", "/limited", nil)
	req1.RemoteAddr = "1.2.3.4:1234"
	r.ServeHTTP(w1, req1)
	require.Equal(t, http.StatusOK, w1.Code)

	w2 := httptest.NewRecorder()
	req2 := httptest.NewRequest("GET", "/limited", nil)
	req2.RemoteAddr = "1.2.3.4:1234"
	r.ServeHTTP(w2, req2)
	require.Equal(t, http.StatusTooManyRequests, w2.Code)

	w3 := httptest.NewRecorder()
	req3 := httptest.NewRequest("GET", "/limited", nil)
	req3.RemoteAddr = "5.6.7.8:4321"
	r.ServeHTTP(w3, req3)
	require.Equal(t, http.StatusOK, w3.Code)
}

func TestGetLimiter_ReturnsSameLimiterForSameKey(t *testing.T) {
	rl := NewIPRateLimiterEvery(time.Second, 1)

	first := rl.getLimiter("1.2.3.4")
	second := rl.getLimiter("1.2.3.4")
	other := rl.getLimiter("5.6.7.8")

	require.Same(t, first, second)
	require.NotSame(t, first, other)
}

func TestNewIPRateLimiterFromEnv_UsesDefaultsWhenInvalid(t *testing.T) {
	t.Setenv("TEST_RATE_LIMIT_RPS", "not-a-number")
	t.Setenv("TEST_RATE_LIMIT_BURST", "0")

	rl := NewIPRateLimiterFromEnv("TEST", 2.5, 4)

	require.Equal(t, rate.Limit(2.5), rl.limit)
	require.Equal(t, 4, rl.burst)
}

func TestNewIPRateLimiterFromEnv_UsesEnvWhenValid(t *testing.T) {
	t.Setenv("TEST_RATE_LIMIT_RPS", "3.25")
	t.Setenv("TEST_RATE_LIMIT_BURST", "7")

	rl := NewIPRateLimiterFromEnv("TEST", 1.0, 1)

	require.Equal(t, rate.Limit(3.25), rl.limit)
	require.Equal(t, 7, rl.burst)
}
