package greeting_test

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/works-on-my-machine-390/concordia-waze/internal/router"
)

func TestGetGreetingEndpoint_ReturnsOK(t *testing.T) {

	router := router.SetupTestRouter()
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/greeting", nil)
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status 200, got %d", w.Code)
	}

}

func TestGetGreetingObjectEndpoint_ReturnsOK(t *testing.T) {

	router := router.SetupTestRouter()
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/greeting/obj", nil)
	router.ServeHTTP(w, req)
	if w.Code != http.StatusOK {
		t.Errorf("Expected status 200, got %d", w.Code)
	}
}
