package repository

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/works-on-my-machine-390/concordia-waze/internal/domain"
)

func writeTempJSONForFloors(t *testing.T, content string) string {
	t.Helper()
	dir := t.TempDir()
	path := filepath.Join(dir, "floors.json")
	if err := os.WriteFile(path, []byte(content), 0644); err != nil {
		t.Fatalf("failed to write temp json: %v", err)
	}
	return path
}

func TestGetBuildingFloors_Found_TrimsAndUppercasesCode(t *testing.T) {
	jsonContent := `{
	  "  EV  ": {
	    " 1 ": {
	      "name": "First",
	      "imgPath": "floor1.png",
	      "vertices": [ {"x": 1, "y": 2}, {"x": 3, "y": 4} ],
	      "edges": [ [0, 1] ],
	      "poi": [ { "type": "elevator", "name": "Elev", "position": {"x": 1, "y": 2}, "polygon": [{"x":1, "y":2}] } ]
	    },
	    "": { "name": "EmptyFloor" }
	  }
	}`

	path := writeTempJSONForFloors(t, jsonContent)
	repo := NewFloorRepository(path)

	floors, err := repo.GetBuildingFloors(" EV ")
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	// empty-key floor should be skipped, only floor "1" should be present
	if len(floors) != 1 {
		t.Fatalf("expected 1 floor entry, got %d", len(floors))
	}

	f, ok := floors["1"]
	if !ok {
		t.Fatalf("expected floor key \"1\" to be present")
	}

	if f.FloorNumber != "1" {
		t.Fatalf("expected FloorNumber '1', got '%s'", f.FloorNumber)
	}
	if f.ImgPath != "floor1.png" {
		t.Fatalf("expected ImgPath floor1.png, got %s", f.ImgPath)
	}
	if len(f.Vertices) != 2 {
		t.Fatalf("expected 2 vertices, got %d", len(f.Vertices))
	}
	if f.Vertices[0].Latitude != 1 || f.Vertices[0].Longitude != 2 {
		t.Fatalf("unexpected first vertex: %+v", f.Vertices[0])
	}
	if len(f.Edges) != 1 || f.Edges[0].StartVertex != 0 || f.Edges[0].EndVertex != 1 {
		t.Fatalf("unexpected edges: %+v", f.Edges)
	}
	if len(f.POIs) != 1 {
		t.Fatalf("expected 1 POI, got %d", len(f.POIs))
	}
	if f.POIs[0].Name != "Elev" || f.POIs[0].Type != "elevator" {
		t.Fatalf("unexpected poi: %+v", f.POIs[0])
	}
	if f.POIs[0].Position.Latitude != 1 || f.POIs[0].Position.Longitude != 2 {
		t.Fatalf("unexpected poi position: %+v", f.POIs[0].Position)
	}
}

func TestGetBuildingFloors_InvalidCampus_ReturnsDomainErrNotFound(t *testing.T) {
	jsonContent := `{
	  "EV": {
	    "1": { "name": "First" }
	  }
	}`

	path := writeTempJSONForFloors(t, jsonContent)
	repo := NewFloorRepository(path)

	_, err := repo.GetBuildingFloors("ABC")
	if err == nil {
		t.Fatalf("expected error, got nil")
	}
	if err != domain.ErrNotFound {
		t.Fatalf("expected domain.ErrNotFound, got %v", err)
	}
}
