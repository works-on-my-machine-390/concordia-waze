package handler

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"reflect"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/works-on-my-machine-390/concordia-waze/internal/application"
	"github.com/works-on-my-machine-390/concordia-waze/internal/constants"
	"github.com/works-on-my-machine-390/concordia-waze/internal/persistence/repository"
)

const sampleJSON = `{
  "monday": {
    "LOY": [
      "09:15",
      "09:30",
      "09:45"
    ],
    "SGW": [
      "09:30",
      "09:45",
      "10:00"
    ]
  },
  "friday": {
    "LOY": [
      "17:15",
      "17:45"
    ],
    "SGW": [
      "17:15",
      "17:45"
    ]
  }
}`

func writeTempFile(t *testing.T, dir, name, content string) string {
	t.Helper()
	path := filepath.Join(dir, name)
	if err := osWriteFile(path, []byte(content)); err != nil {
		t.Fatalf("failed to write temp file: %v", err)
	}
	return path
}

// osWriteFile wraps os.WriteFile to keep imports tidy in this test file.
func osWriteFile(path string, data []byte) error {
	return os.WriteFile(path, data, 0o644)
}

func TestGetCampusDaySchedule_OK(t *testing.T) {
	t.Parallel()
	gin.SetMode(gin.TestMode)

	tmpDir := t.TempDir()
	file := writeTempFile(t, tmpDir, "shuttle.json", sampleJSON)

	repo := repository.NewShuttleDataRepository(file)
	if err := repo.Load(); err != nil {
		t.Fatalf("failed to load repository: %v", err)
	}

	// Construct real application service if available in your codebase.
	// This assumes application.NewShuttleService(repo) exists and returns *application.ShuttleService.
	appSvc := application.NewShuttleService(repo)
	h := NewShuttleHandler(appSvc)

	// Create a test gin context with params
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	// set route params expected by handler: :day and :campus_code
	c.Params = gin.Params{
		{Key: "day", Value: "monday"},
		{Key: "campus_code", Value: "LOY"},
	}

	h.GetCampusDaySchedule(c)

	resp := w.Result()
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected status 200, got %d", resp.StatusCode)
	}

	var got []string
	if err := json.NewDecoder(resp.Body).Decode(&got); err != nil {
		t.Fatalf("failed to decode response JSON: %v", err)
	}

	want := []string{"09:15", "09:30", "09:45"}
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("unexpected times: got=%v want=%v", got, want)
	}
}

func TestGetCampusDaySchedule_NotFound(t *testing.T) {
	t.Parallel()
	gin.SetMode(gin.TestMode)

	tmpDir := t.TempDir()
	file := writeTempFile(t, tmpDir, "shuttle.json", sampleJSON)

	repo := repository.NewShuttleDataRepository(file)
	if err := repo.Load(); err != nil {
		t.Fatalf("failed to load repository: %v", err)
	}

	appSvc := application.NewShuttleService(repo)
	h := NewShuttleHandler(appSvc)

	// Request a day/campus that doesn't exist
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Params = gin.Params{
		{Key: "day", Value: "sunday"},
		{Key: "campus_code", Value: "LOY"},
	}

	h.GetCampusDaySchedule(c)

	resp := w.Result()
	defer resp.Body.Close()

	// Handler maps service errors to 500 (per handler implementation)
	if resp.StatusCode != http.StatusInternalServerError {
		t.Fatalf("expected status 500 for not found, got %d", resp.StatusCode)
	}
}

func TestGetDepartureData_OK(t *testing.T) {
	t.Parallel()
	gin.SetMode(gin.TestMode)

	tmpDir := t.TempDir()
	file := writeTempFile(t, tmpDir, "shuttle.json", sampleJSON)

	repo := repository.NewShuttleDataRepository(file)
	if err := repo.Load(); err != nil {
		t.Fatalf("failed to load repository: %v", err)
	}

	appSvc := application.NewShuttleService(repo)
	h := NewShuttleHandler(appSvc)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)

	h.GetDepartureData(c)

	resp := w.Result()
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected status 200, got %d", resp.StatusCode)
	}

	var got map[string]map[string][]string
	if err := json.NewDecoder(resp.Body).Decode(&got); err != nil {
		t.Fatalf("failed to decode response JSON: %v", err)
	}

	want := map[string]map[string][]string{
		"monday": {
			"LOY": {"09:15", "09:30", "09:45"},
			"SGW": {"09:30", "09:45", "10:00"},
		},
		"friday": {
			"LOY": {"17:15", "17:45"},
			"SGW": {"17:15", "17:45"},
		},
	}
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("unexpected departure data:\n got=%#v\nwant=%#v", got, want)
	}
}
func TestGetStopPositionOK(t *testing.T) {
	t.Parallel()
	gin.SetMode(gin.TestMode)

	// not accessed in this test, but required to construct the handler
	tmpDir := t.TempDir()
	file := writeTempFile(t, tmpDir, "shuttle.json", sampleJSON)

	repo := repository.NewShuttleDataRepository(file)
	if err := repo.Load(); err != nil {
		t.Fatalf("failed to load repository: %v", err)
	}
	// end

	appSvc := application.NewShuttleService(repo)
	h := NewShuttleHandler(appSvc)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)

	h.GetShuttleMarkerPositions(c)
	resp := w.Result()
	defer resp.Body.Close()

	var got map[string]map[string]float64
	if err := json.NewDecoder(resp.Body).Decode(&got); err != nil {
		t.Fatalf("failed to decode response JSON: %v", err)
	}

	want := map[string]map[string]float64{
		"SGW": {
			"lat": constants.SGWShuttleStopPosition.Lat,
			"lng": constants.SGWShuttleStopPosition.Lng,
		},
		"LOY": {
			"lat": constants.LOYShuttleStopPosition.Lat,
			"lng": constants.LOYShuttleStopPosition.Lng,
		},
	}
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("unexpected stop location data:\n got=%#v\nwant=%#v", got, want)
	}
}
