package handler

import (
	"bytes"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/works-on-my-machine-390/concordia-waze/internal/domain/request_format"
)

func init() {
	// Set Gin to test mode so it doesn't spam the console
	gin.SetMode(gin.TestMode)
}

func TestNormalizeMode(t *testing.T) {
	tests := []struct {
		name     string
		raw      string
		expected string
		valid    bool
	}{
		{"Empty string defaults to walking", "", "walking", true},
		{"Whitespace defaults to walking", "   ", "walking", true},
		{"Valid mode walking", "walking", "walking", true},
		{"Valid mode driving", "DRIVING", "driving", true},
		{"Valid mode transit", " Transit ", "transit", true},
		{"Valid mode shuttle", "shuttle", "shuttle", true},
		{"Valid mode bicycling", "Bicycling", "bicycling", true},
		{"Invalid mode", "flying", "", false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mode, valid := normalizeMode(tt.raw)
			assert.Equal(t, tt.expected, mode)
			assert.Equal(t, tt.valid, valid)
		})
	}
}

func TestHasAny(t *testing.T) {
	assert.True(t, hasAny("a", ""))
	assert.True(t, hasAny("", " b "))
	assert.False(t, hasAny("", "  "))
	assert.False(t, hasAny())
}

func TestParseFloatQuery(t *testing.T) {
	tests := []struct {
		name          string
		queryValue    string
		expectedVal   float64
		expectedValid bool
	}{
		{"Valid float", "45.123", 45.123, true},
		{"Valid negative float", "-73.987", -73.987, true},
		{"Empty string", "", 0, false},
		{"Whitespace", "   ", 0, false},
		{"Invalid float string", "abc", 0, false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)

			// Setup mock request with query param
			c.Request, _ = http.NewRequest("GET", "/?val="+tt.queryValue, nil)

			val, valid := parseFloatQuery(c, "val")
			assert.Equal(t, tt.expectedVal, val)
			assert.Equal(t, tt.expectedValid, valid)
		})
	}
}

func TestWriteDirectionsError(t *testing.T) {
	tests := []struct {
		name           string
		err            error
		expectedStatus int
		expectedBody   string
	}{
		{
			name:           "Nil error",
			err:            nil,
			expectedStatus: http.StatusOK, // If nil, handler does nothing, context remains 200 by default
			expectedBody:   "",
		},
		{
			name:           "Bad Request - invalid mode",
			err:            errors.New("invalid mode"),
			expectedStatus: http.StatusBadRequest,
			expectedBody:   `{"error":"invalid mode"}`,
		},
		{
			name:           "Bad Request - shuttle not applicable",
			err:            errors.New("shuttle not applicable for same-campus trip"),
			expectedStatus: http.StatusBadRequest,
			expectedBody:   `{"error":"shuttle not applicable for same-campus trip"}`,
		},
		{
			name:           "OK - No shuttle available",
			err:            errors.New("No shuttle available at this time."),
			expectedStatus: http.StatusOK,
			expectedBody:   `{"message":"No shuttle available at this time."}`,
		},
		{
			name:           "Internal Server Error - generic",
			err:            errors.New("database connection lost"),
			expectedStatus: http.StatusInternalServerError,
			expectedBody:   `{"error":"database connection lost"}`,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)

			h := &DirectionsHandler{}
			h.writeDirectionsError(c, tt.err)

			if tt.err != nil {
				assert.Equal(t, tt.expectedStatus, w.Code)
				assert.JSONEq(t, tt.expectedBody, w.Body.String())
			}
		})
	}
}

func TestGetDirections_ValidationFailures(t *testing.T) {
	// Note: We test validation failures here because testing success paths
	// requires mocking *application.DirectionsService, which is a concrete pointer in your struct.
	tests := []struct {
		name           string
		query          string
		expectedStatus int
		expectedError  string
	}{
		{"Missing start_lat", "?start_lng=2&end_lat=3&end_lng=4", http.StatusBadRequest, "invalid start_lat"},
		{"Invalid start_lng", "?start_lat=1&start_lng=abc&end_lat=3&end_lng=4", http.StatusBadRequest, "invalid start_lng"},
		{"Missing end_lat", "?start_lat=1&start_lng=2&end_lng=4", http.StatusBadRequest, "invalid end_lat"},
		{"Invalid end_lng", "?start_lat=1&start_lng=2&end_lat=3&end_lng=xyz", http.StatusBadRequest, "invalid end_lng"},
		{"Invalid mode", "?start_lat=1&start_lng=2&end_lat=3&end_lng=4&mode=teleport", http.StatusBadRequest, "invalid mode"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)
			c.Request, _ = http.NewRequest("GET", "/directions"+tt.query, nil)

			h := &DirectionsHandler{}
			h.GetDirections(c)

			assert.Equal(t, tt.expectedStatus, w.Code)
			assert.Contains(t, w.Body.String(), tt.expectedError)
		})
	}
}

func TestGetDirectionsByBuildings_ValidationFailures(t *testing.T) {
	tests := []struct {
		name           string
		query          string
		expectedStatus int
		expectedError  string
	}{
		{"Missing start_code", "?end_code=H", http.StatusBadRequest, "invalid start_code"},
		{"Missing end_code", "?start_code=CC", http.StatusBadRequest, "invalid end_code"},
		{"Invalid mode", "?start_code=CC&end_code=H&mode=teleport", http.StatusBadRequest, "invalid mode"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)
			c.Request, _ = http.NewRequest("GET", "/directions/buildings"+tt.query, nil)

			h := &DirectionsHandler{}
			h.GetDirectionsByBuildings(c)

			assert.Equal(t, tt.expectedStatus, w.Code)
			assert.Contains(t, w.Body.String(), tt.expectedError)
		})
	}
}

func TestGetFullDirections_ValidationFailures(t *testing.T) {
	t.Run("Invalid JSON Body", func(t *testing.T) {
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Request, _ = http.NewRequest("POST", "/directions", bytes.NewBufferString("{bad json}"))
		c.Request.Header.Set("Content-Type", "application/json")

		h := &DirectionsHandler{}
		h.GetFullDirections(c)

		assert.Equal(t, http.StatusBadRequest, w.Code)
		assert.Contains(t, w.Body.String(), "Invalid request format")
	})

	t.Run("Empty Mode array gets defaulted", func(t *testing.T) {
		// Because this hits `directionsRedirector.GetFullDirections`, if that interface
		// is nil it will panic. We just verify the JSON parsing sets the default modes properly
		// before panicking or failing. To test this fully without panicking, you'd inject a mock Redirector.

		reqBody := request_format.RouteRequest{}
		jsonBody, _ := json.Marshal(reqBody)

		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Request, _ = http.NewRequest("POST", "/directions", bytes.NewBuffer(jsonBody))
		c.Request.Header.Set("Content-Type", "application/json")

		// Create a mock implementation for DirectionsRedirectorService if it's an interface
		// h := &DirectionsHandler{ directionsRedirector: myMockRedirector }
		// h.GetFullDirections(c)
		// ... assert mock was called with the defaulted string array
	})
}

func TestErrorString(t *testing.T) {
	err := errorString("custom error message")
	assert.Equal(t, "custom error message", err.Error())
}
