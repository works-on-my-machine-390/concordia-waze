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
	path := filepath.Join(dir, "temp_building_information.json")
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
				"name": "MB Building",
				"long_name": "John Molson Building",
				"address": "1450 Guy St, Montreal",
				"latitude": 45.4970,
				"longitude": -73.5792,
				"metro_accessible": true,
				"departments": [
					"Accountancy"
				],
				"services": [
					"Career Management Services"
				],
				"venues": [
					"Concordia Conference Centre, 9th Floor"
				],
				"accessibility": [
					"Accessible entrance"
				]
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
	if b.Name != "MB Building" {
		t.Fatalf("expected name MB Building, got %s", b.Name)
	}
	if b.Address != "1450 Guy St, Montreal" {
		t.Fatalf("expected address 1450 Guy St, Montreal, got %s", b.Address)
	}
	if b.MetroAccessible != true {
		t.Fatalf("expected MetroAccesible to be true, got false")
	}
	if len(b.Departments) != 1 || b.Departments[0] != "Accountancy" {
		t.Fatalf("unexpected departments: %#v", b.Departments)
	}
	if len(b.Services) != 1 || b.Services[0] != "Career Management Services" {
		t.Fatalf("unexpected services: %#v", b.Services)
	}
	if len(b.Venues) != 1 || b.Venues[0] != "Concordia Conference Centre, 9th Floor" {
		t.Fatalf("unexpected venues: %#v", b.Venues)
	}
	if len(b.Accessibility) != 1 || b.Accessibility[0] != "Accessible entrance" {
		t.Fatalf("unexpected accessibility: %#v", b.Accessibility)
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

func TestGetAllBuildingsByCampus_ReturnsGroupedSummaries(t *testing.T) {
	jsonContent := `{
		"SGW": [
			{ "code": "MB", "name": "MB Building", "long_name": "John Molson Building", "address": "1450 Guy St" }
		],
		"LOY": [
			{ "code": "VL", "name": "Vanier Library", "long_name": "Vanier Library Building", "address": "7141 Sherbrooke W" }
		]
	}`

	path := writeTempJSON(t, jsonContent)
	repo := NewBuildingDataRepository(path)

	grouped, err := repo.GetAllBuildingsByCampus()
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	// Expect both campus keys to be present and uppercased
	sgwList, ok := grouped["SGW"]
	if !ok {
		t.Fatalf("expected SGW key present")
	}
	if len(sgwList) != 1 {
		t.Fatalf("expected 1 SGW building, got %d", len(sgwList))
	}
	if sgwList[0].Code != "MB" || sgwList[0].Campus != "SGW" {
		t.Fatalf("unexpected SGW entry: %+v", sgwList[0])
	}

	loyList, ok := grouped["LOY"]
	if !ok {
		t.Fatalf("expected LOY key present")
	}
	if len(loyList) != 1 {
		t.Fatalf("expected 1 LOY building, got %d", len(loyList))
	}
	if loyList[0].Code != "VL" || loyList[0].Campus != "LOY" {
		t.Fatalf("unexpected LOY entry: %+v", loyList[0])
	}
}
