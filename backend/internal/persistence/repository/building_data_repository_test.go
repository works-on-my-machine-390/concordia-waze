package repository

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/works-on-my-machine-390/concordia-waze/internal/domain"
)

func writeTempJSON(t *testing.T, content string) string {
	t.Helper()
	dir := t.TempDir()
	path := filepath.Join(dir, "building_information.json")
	if err := os.WriteFile(path, []byte(content), 0644); err != nil {
		t.Fatalf("failed to write temp json: %v", err)
	}
	return path
}

func TestEnsureLoaded_FileNotFound_ReturnsError(t *testing.T) {
	repo := NewBuildingDataRepository("this/path/does/not/exist.json")

	_, err := repo.GetCampusPolygons("SGW")
	if err == nil {
		t.Fatalf("expected error, got nil")
	}
	// we don't match exact error text because OS errors differ by platform
}

func TestEnsureLoaded_InvalidJSON_ReturnsError(t *testing.T) {
	path := writeTempJSON(t, `{"SGW": [ INVALID JSON ]}`)
	repo := NewBuildingDataRepository(path)

	_, err := repo.GetCampusPolygons("SGW")
	if err == nil {
		t.Fatalf("expected error, got nil")
	}
}

func TestGetBuilding_Found_TrimsAndUppercasesCode(t *testing.T) {
	jsonContent := `{
		"SGW": [
			{
				"code": "MB",
				"name": "John Molson Building",
				"long_name": "John Molson School of Business",
				"address": "1450 Guy St, Montreal",
				"latitude": 45.4970,
				"longitude": -73.5792
			}
		]
	}`

	path := writeTempJSON(t, jsonContent)
	repo := NewBuildingDataRepository(path)

	b, err := repo.GetBuilding("  mb ")
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if b == nil {
		t.Fatalf("expected building, got nil")
	}
	if b.Code != "MB" {
		t.Fatalf("expected code MB, got %s", b.Code)
	}
	if b.Name != "John Molson Building" {
		t.Fatalf("expected name John Molson Building, got %s", b.Name)
	}
	if b.Address != "1450 Guy St, Montreal" {
		t.Fatalf("expected address 1450 Guy St, Montreal, got %s", b.Address)
	}
	// Ensure Services/Departments are present even if empty (API stability)
	if b.Services == nil || b.Departments == nil {
		t.Fatalf("expected non-nil services/departments slices")
	}
}

func TestGetBuilding_NotFound_ReturnsDomainErrNotFound(t *testing.T) {
	jsonContent := `{
		"SGW": [
			{ "code": "MB", "name": "John Molson Building" }
		]
	}`

	path := writeTempJSON(t, jsonContent)
	repo := NewBuildingDataRepository(path)

	_, err := repo.GetBuilding("XYZ")
	if err == nil {
		t.Fatalf("expected error, got nil")
	}
	if err != domain.ErrNotFound {
		t.Fatalf("expected domain.ErrNotFound, got %v", err)
	}
}

func TestGetCampusPolygons_Found_ReturnsPolygonPointsAndMapsLngLatToLatLng(t *testing.T) {
	jsonContent := `{
		"SGW": [
			{
				"code": "MB",
				"name": "John Molson Building",
				"shape": {
					"type": "Polygon",
					"coordinates": [
						[
							[-73.5792, 45.4971],
							[-73.5794, 45.4973],
							[-73.5791, 45.4974]
						]
					]
				}
			}
		]
	}`

	path := writeTempJSON(t, jsonContent)
	repo := NewBuildingDataRepository(path)

	polys, err := repo.GetCampusPolygons("SGW")
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if len(polys) != 1 {
		t.Fatalf("expected 1 polygon result, got %d", len(polys))
	}
	if polys[0].Code != "MB" {
		t.Fatalf("expected code MB, got %s", polys[0].Code)
	}
	if len(polys[0].Polygon) != 3 {
		t.Fatalf("expected 3 points, got %d", len(polys[0].Polygon))
	}

	
	first := polys[0].Polygon[0]
	if first.Lat != 45.4971 || first.Lng != -73.5792 {
		t.Fatalf("unexpected point mapping: %+v", first)
	}
}

func TestGetCampusPolygons_SkipsBuildingsWithNilOrEmptyOrInvalidShape(t *testing.T) {
	jsonContent := `{
		"SGW": [
			{
				"code": "GOOD",
				"name": "Good Building",
				"shape": {
					"type": "Polygon",
					"coordinates": [
						[
							[-73.0, 45.0],
							[-73.1, 45.1]
						]
					]
				}
			},
			{
				"code": "NIL",
				"name": "Nil Shape",
				"shape": null
			},
			{
				"code": "EMPTY1",
				"name": "Empty Coordinates",
				"shape": {
					"type": "Polygon",
					"coordinates": []
				}
			},
			{
				"code": "EMPTY2",
				"name": "Empty Ring",
				"shape": {
					"type": "Polygon",
					"coordinates": [ [] ]
				}
			},
			{
				"code": "BADPAIR",
				"name": "Bad Pair Len",
				"shape": {
					"type": "Polygon",
					"coordinates": [
						[
							[-73.0]
						]
					]
				}
			}
		]
	}`

	path := writeTempJSON(t, jsonContent)
	repo := NewBuildingDataRepository(path)

	polys, err := repo.GetCampusPolygons("SGW")
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	foundGood := false
	for _, p := range polys {
		if p.Code == "GOOD" {
			foundGood = true
			if len(p.Polygon) != 2 {
				t.Fatalf("expected GOOD polygon to have 2 points, got %d", len(p.Polygon))
			}
		}
		if p.Code == "NIL" || p.Code == "EMPTY1" || p.Code == "EMPTY2" {
			t.Fatalf("did not expect %s to be included (should be skipped due to shape)", p.Code)
		}
	}
	if !foundGood {
		t.Fatalf("expected GOOD building polygon to be present")
	}
}


func TestGetCampusPolygons_InvalidCampus_ReturnsDomainErrNotFound(t *testing.T) {
	jsonContent := `{
		"SGW": [
			{ "code": "MB", "name": "John Molson Building" }
		]
	}`

	path := writeTempJSON(t, jsonContent)
	repo := NewBuildingDataRepository(path)

	_, err := repo.GetCampusPolygons("ABC")
	if err == nil {
		t.Fatalf("expected error, got nil")
	}
	if err != domain.ErrNotFound {
		t.Fatalf("expected domain.ErrNotFound, got %v", err)
	}
}

func TestGetCampusPolygons_TrimsAndUppercasesCampus(t *testing.T) {
	jsonContent := `{
		"  sGw  ": [
			{
				"code": "MB",
				"name": "John Molson Building",
				"shape": {
					"type": "Polygon",
					"coordinates": [
						[
							[-73.5792, 45.4971],
							[-73.5794, 45.4973]
						]
					]
				}
			}
		]
	}`

	path := writeTempJSON(t, jsonContent)
	repo := NewBuildingDataRepository(path)

	polys, err := repo.GetCampusPolygons(" sgw ")
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if len(polys) != 1 {
		t.Fatalf("expected 1 polygon, got %d", len(polys))
	}
	if polys[0].Code != "MB" {
		t.Fatalf("expected MB, got %s", polys[0].Code)
	}
}
