package repository

import (
	"os"
	"path/filepath"
	"reflect"
	"testing"
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
	if err := os.WriteFile(path, []byte(content), 0o644); err != nil {
		t.Fatalf("failed to write temp file: %v", err)
	}
	return path
}

func TestLoadAndGetDepartures_Success(t *testing.T) {
	t.Parallel()

	tmpDir := t.TempDir()
	file := writeTempFile(t, tmpDir, "shuttle.json", sampleJSON)

	repo := NewShuttleDataRepository(file)

	// don't call Load() explicitly to exercise ensureLoaded path in GetDepartures
	got, err := repo.GetDepartures("monday", "LOY")
	if err != nil {
		t.Fatalf("GetDepartures returned error: %v", err)
	}
	want := []string{"09:15", "09:30", "09:45"}
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("unexpected departures for monday/LOY: got=%v want=%v", got, want)
	}

	// Case-insensitivity checks: day and campus casing variations should still work
	got2, err := repo.GetDepartures("Monday", "sgw")
	if err != nil {
		t.Fatalf("GetDepartures returned error for Monday/sgw: %v", err)
	}
	want2 := []string{"09:30", "09:45", "10:00"}
	if !reflect.DeepEqual(got2, want2) {
		t.Fatalf("unexpected departures for Monday/sgw: got=%v want=%v", got2, want2)
	}
}

func TestGetDepartures_NotFound(t *testing.T) {
	t.Parallel()

	tmpDir := t.TempDir()
	file := writeTempFile(t, tmpDir, "shuttle.json", sampleJSON)

	repo := NewShuttleDataRepository(file)

	// Unknown day
	if _, err := repo.GetDepartures("someday", "LOY"); err == nil {
		t.Fatalf("expected error for unknown day, got nil")
	}

	// Known day but unknown campus
	if _, err := repo.GetDepartures("monday", "UNKNOWN"); err == nil {
		t.Fatalf("expected error for unknown campus, got nil")
	}
}

func TestLoad_InvalidJSON(t *testing.T) {
	t.Parallel()

	tmpDir := t.TempDir()
	file := writeTempFile(t, tmpDir, "bad.json", `{"monday": {"LOY": [ "09:15", }}`) // invalid JSON

	repo := NewShuttleDataRepository(file)
	if err := repo.Load(); err == nil {
		t.Fatalf("expected Load to fail for invalid JSON, but it succeeded")
	}
}

func TestGetDepartureData_DeepCopyAndImmutability(t *testing.T) {
	t.Parallel()

	tmpDir := t.TempDir()
	file := writeTempFile(t, tmpDir, "shuttle.json", sampleJSON)

	repo := NewShuttleDataRepository(file)
	if err := repo.Load(); err != nil {
		t.Fatalf("failed to load repo: %v", err)
	}

	full, err := repo.GetDepartureData()
	if err != nil {
		t.Fatalf("GetDepartureData returned error: %v", err)
	}

	// expected map (note keys normalized by repository: lowercase day, uppercase campus)
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

	if !reflect.DeepEqual(full, want) {
		t.Fatalf("GetDepartureData returned unexpected data:\n got=%#v\nwant=%#v", full, want)
	}

	// Mutate returned map and slices and ensure repository internal data is unchanged.
	// 1) change a time in the returned slice
	full["monday"]["LOY"][0] = "00:00"
	// 2) delete a campus entry
	delete(full["monday"], "SGW")
	// 3) add a new day
	full["sunday"] = map[string][]string{"LOY": {"01:00"}}

	// Fetch from repo again and ensure original data persists
	gotAfter, err := repo.GetDepartures("monday", "LOY")
	if err != nil {
		t.Fatalf("GetDepartures returned error after mutation: %v", err)
	}
	if gotAfter[0] != "09:15" {
		t.Fatalf("repository internal data was mutated through GetDepartureData result; gotAfter[0]=%q want %q", gotAfter[0], "09:15")
	}

	// Ensure SGW still exists for monday in repo
	gotSGW, err := repo.GetDepartures("monday", "SGW")
	if err != nil {
		t.Fatalf("expected SGW on monday to still exist in repo, got error: %v", err)
	}
	if !reflect.DeepEqual(gotSGW, []string{"09:30", "09:45", "10:00"}) {
		t.Fatalf("SGW times changed unexpectedly: got=%v", gotSGW)
	}

	// Ensure newly added sunday in the returned map does not appear in the repo
	if _, err := repo.GetDepartures("sunday", "LOY"); err == nil {
		t.Fatalf("expected no sunday data in repo, but GetDepartures returned data (repo was mutated)")
	}
}
