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

func TestGetBuildingFloors_FileReadError_ReturnsWrappedError(t *testing.T) {
	repo := NewFloorRepository("/non/existent/path.json")

	_, err := repo.GetBuildingFloors("MB")
	if err == nil {
		t.Fatalf("expected error, got nil")
	}

}

func TestGetBuildingFloors_Found_TrimsAndUppercasesCode(t *testing.T) {
	jsonContent := `[
  {
    "MB": [
      {
        "number": 0,
        "name": "mbFloor0",
        "imgPath": "string",
        "vertices": [ {"x": 0, "y": 0} ],
        "edges": [ [0, 1] ],
        "poi": [
          {
            "type": "string",
            "name": "string",
            "position": {"x": 0, "y": 0},
            "polygon": [ {"x": 0, "y": 0} ]
          }
        ]
      },
      {
        "number": 3,
        "name": "mbFloor3",
        "imgPath": "string",
        "vertices": [ {"x": 0, "y": 0} ],
        "edges": [ [0, 1] ],
        "poi": [
          {
            "type": "string",
            "name": "string",
            "position": {"x": 0, "y": 0},
            "polygon": [ {"x": 0, "y": 0} ]
          }
        ]
      }
    ]
  },
  {
    "H": [
      {
        "number": 1,
        "name": "hFloor1",
        "imgPath": "string",
        "vertices": [ {"x": 0, "y": 0} ],
        "edges": [ [0, 1] ],
        "poi": [
          {
            "type": "string",
            "name": "string",
            "position": {"x": 0, "y": 0},
            "polygon": [ {"x": 0, "y": 0} ]
          }
        ]
      },
      {
        "number": 5,
        "name": "hFloor5",
        "imgPath": "string",
        "vertices": [ {"x": 0, "y": 0} ],
        "edges": [ [0, 1] ],
        "poi": [
          {
            "type": "string",
            "name": "string",
            "position": {"x": 0, "y": 0},
            "polygon": [ {"x": 0, "y": 0} ]
          }
        ]
      }
    ]
  }
]`

	path := writeTempJSONForFloors(t, jsonContent)
	repo := NewFloorRepository(path)

	floors, err := repo.GetBuildingFloors(" MB ")
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	// Expect two floors for MB (numbers 0 and 3) and verify their fields
	if len(floors) != 2 {
		t.Fatalf("expected 2 floor entries, got %d", len(floors))
	}

	expected := []struct {
		num  int
		name string
	}{
		{0, "mbFloor0"},
		{3, "mbFloor3"},
	}

	for i, exp := range expected {
		if floors[i].FloorNumber != exp.num {
			t.Fatalf("expected floor number %d at index %d, got %d", exp.num, i, floors[i].FloorNumber)
		}
		if floors[i].FloorName != exp.name {
			t.Fatalf("expected floor name %q at index %d, got %q", exp.name, i, floors[i].FloorName)
		}
		// basic checks for mapped structures
		if len(floors[i].Vertices) != 1 {
			t.Fatalf("expected 1 vertex for floor %d, got %d", exp.num, len(floors[i].Vertices))
		}
		if len(floors[i].POIs) != 1 {
			t.Fatalf("expected 1 POI for floor %d, got %d", exp.num, len(floors[i].POIs))
		}
	}

}

func TestGetBuildingFloors_InvalidCampus_ReturnsDomainErrNotFound(t *testing.T) {
	jsonContent := `[
	{
		"MB": [
				{
				"number": 0,
				"name": "mbFloor0",
				"imgPath": "string",
				"vertices": [ {"x": 0, "y": 0} ],
				"edges": [ [0, 1] ],
				"poi": []
				}
	]
	}
	]`

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
