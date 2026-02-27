package router

import (
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
)

func TestSetupRouterRegistersRoutes(t *testing.T) {
	os.Setenv("JWT_SECRET", "testsecret")
	defer os.Unsetenv("JWT_SECRET")

	r := SetupTestRouter()
	if r == nil {
		t.Fatalf("expected router, got nil")
	}

	req := httptest.NewRequest(http.MethodGet, "/swagger/index.html", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code == http.StatusNotFound {

		req2 := httptest.NewRequest(http.MethodOptions, "/auth/login", nil)
		w2 := httptest.NewRecorder()
		r.ServeHTTP(w2, req2)

		if w2.Code == http.StatusNotFound {
			t.Fatalf("expected /auth/login route to exist, got 404")
		}
	}
}

func TestSetupTestRouterReturnsRouter(t *testing.T) {
	os.Setenv("JWT_SECRET", "testsecret")
	defer os.Unsetenv("JWT_SECRET")

	r := SetupTestRouter()
	if r == nil {
		t.Fatalf("expected router, got nil")
	}
}
