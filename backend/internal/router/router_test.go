package router

import (
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
)

func TestSetupRouter_RegistersRoutes(t *testing.T) {
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

func TestSetupTestRouter_ReturnsRouter(t *testing.T) {
	os.Setenv("JWT_SECRET", "testsecret")
	defer os.Unsetenv("JWT_SECRET")

	r := SetupTestRouter()
	if r == nil {
		t.Fatalf("expected router, got nil")
	}
}

func TestSetupRouter_PanicOnMissingDataDir(t *testing.T) {
	// Switch to a temp directory where "campusFloormaps/Data" doesn't exist
	tmp := t.TempDir()
	cwd, _ := os.Getwd()
	defer os.Chdir(cwd)

	if err := os.Chdir(tmp); err != nil {
		t.Fatal(err)
	}

	defer func() {
		if r := recover(); r == nil {
			t.Errorf("SetupRouter should have panicked when data dir is missing")
		}
	}()

	// This call should panic because it can't find the indoor data dir
	SetupRouter()
}
