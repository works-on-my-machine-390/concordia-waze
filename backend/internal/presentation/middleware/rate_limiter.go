package middleware

import (
	"net/http"
	"os"
	"strconv"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"golang.org/x/time/rate"
)

// IPRateLimiter keeps a limiter per client key (we'll use IP).
type IPRateLimiter struct {
	limit rate.Limit
	burst int
	mu    sync.Mutex
	byKey map[string]*rate.Limiter
}

// NewIPRateLimiter builds an IP-based rate limiter.
func NewIPRateLimiter(limit rate.Limit, burst int) *IPRateLimiter {
	return &IPRateLimiter{
		limit: limit,
		burst: burst,
		byKey: make(map[string]*rate.Limiter),
	}
}

func (rl *IPRateLimiter) getLimiter(key string) *rate.Limiter {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	lim, ok := rl.byKey[key]
	if !ok {
		lim = rate.NewLimiter(rl.limit, rl.burst)
		rl.byKey[key] = lim
	}
	return lim
}

// Middleware returns a gin middleware that enforces the limiter.
func (rl *IPRateLimiter) Middleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		key := c.ClientIP() // per-client IP limiting
		lim := rl.getLimiter(key)

		if !lim.Allow() {
			c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{
				"error": "rate limit exceeded",
			})
			return
		}

		c.Next()
	}
}

// ---- helpers from env (optional, but practical) ----

// Env format (per prefix):
//
//	<PREFIX>_RATE_LIMIT_RPS   (float, e.g. 2.5)
//	<PREFIX>_RATE_LIMIT_BURST (int, e.g. 5)
//
// Defaults are used if env vars are missing/invalid.
func NewIPRateLimiterFromEnv(prefix string, defaultRPS float64, defaultBurst int) *IPRateLimiter {
	rps := defaultRPS
	burst := defaultBurst

	if v := os.Getenv(prefix + "_RATE_LIMIT_RPS"); v != "" {
		if f, err := strconv.ParseFloat(v, 64); err == nil && f > 0 {
			rps = f
		}
	}
	if v := os.Getenv(prefix + "_RATE_LIMIT_BURST"); v != "" {
		if i, err := strconv.Atoi(v); err == nil && i > 0 {
			burst = i
		}
	}

	// rate.Limit is events/second
	return NewIPRateLimiter(rate.Limit(rps), burst)
}

// Utility for tests / very strict configs: "1 per X duration"
func NewIPRateLimiterEvery(d time.Duration, burst int) *IPRateLimiter {
	return NewIPRateLimiter(rate.Every(d), burst)
}
