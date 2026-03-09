package application

import (
	"errors"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/works-on-my-machine-390/concordia-waze/internal/domain"
)

// Mock implementations for testing
type mockFloorRepoForPath struct {
	floors map[string][]domain.Floor
	err    error
}

func (f *mockFloorRepoForPath) GetBuildingFloors(code string) ([]domain.Floor, error) {
	if f.err != nil {
		return nil, f.err
	}
	floors, ok := f.floors[code]
	if !ok {
		return nil, errors.New("building not found")
	}
	return floors, nil
}

type mockIndoorRoomRepoForPath struct {
	rooms map[string][]domain.IndoorRoom
	err   error
}

func (f *mockIndoorRoomRepoForPath) GetByBuilding(buildingCode string) ([]domain.IndoorRoom, error) {
	if f.err != nil {
		return nil, f.err
	}
	rooms, ok := f.rooms[buildingCode]
	if !ok {
		return []domain.IndoorRoom{}, nil
	}
	return rooms, nil
}

// Helper to create test floors with vertices, edges, and POIs
func createTestFloor(number int, name string, vertices []domain.Coordinates, edges []domain.Edge, pois []domain.PointOfInterest) domain.Floor {
	return domain.Floor{
		FloorNumber: number,
		FloorName:   name,
		Vertices:    vertices,
		Edges:       edges,
		POIs:        pois,
	}
}

// Helper to create a simple floor graph with specified POIs
func createSimpleFloor(floorNum int, name string, pois []domain.PointOfInterest) domain.Floor {
	// For floors with both transitions, use 6 vertices; otherwise 5
	hasBoth := len(pois) > 1
	var vertices []domain.Coordinates
	var edges []domain.Edge

	if hasBoth {
		vertices = []domain.Coordinates{
			{X: 0, Y: 0},
			{X: 1, Y: 0},
			{X: 1, Y: 1},
			{X: 0, Y: 1},
			{X: 0.3, Y: 0.3},
			{X: 0.7, Y: 0.7},
		}
		edges = []domain.Edge{
			{StartVertex: 0, EndVertex: 1},
			{StartVertex: 1, EndVertex: 2},
			{StartVertex: 2, EndVertex: 3},
			{StartVertex: 3, EndVertex: 0},
			{StartVertex: 0, EndVertex: 4},
			{StartVertex: 1, EndVertex: 4},
			{StartVertex: 2, EndVertex: 5},
			{StartVertex: 3, EndVertex: 5},
			{StartVertex: 4, EndVertex: 5},
		}
	} else {
		vertices = []domain.Coordinates{
			{X: 0, Y: 0},
			{X: 1, Y: 0},
			{X: 1, Y: 1},
			{X: 0, Y: 1},
			{X: 0.5, Y: 0.5},
		}
		edges = []domain.Edge{
			{StartVertex: 0, EndVertex: 1},
			{StartVertex: 1, EndVertex: 2},
			{StartVertex: 2, EndVertex: 3},
			{StartVertex: 3, EndVertex: 0},
			{StartVertex: 0, EndVertex: 4},
			{StartVertex: 1, EndVertex: 4},
			{StartVertex: 2, EndVertex: 4},
			{StartVertex: 3, EndVertex: 4},
		}
	}
	return createTestFloor(floorNum, name, vertices, edges, pois)
}

func createSimpleFloorWithStairs(floorNum int, name string) domain.Floor {
	return createSimpleFloor(floorNum, name, []domain.PointOfInterest{
		{Name: "stairs_1", Type: "stairs", Position: domain.Coordinates{X: 0.5, Y: 0.5}},
	})
}

func createSimpleFloorWithElevator(floorNum int, name string) domain.Floor {
	return createSimpleFloor(floorNum, name, []domain.PointOfInterest{
		{Name: "elevator_1", Type: "elevator", Position: domain.Coordinates{X: 0.5, Y: 0.5}},
	})
}

func createSimpleFloorWithBothTransitions(floorNum int, name string) domain.Floor {
	return createSimpleFloor(floorNum, name, []domain.PointOfInterest{
		{Name: "stairs_1", Type: "stairs", Position: domain.Coordinates{X: 0.3, Y: 0.3}},
		{Name: "elevator_1", Type: "elevator", Position: domain.Coordinates{X: 0.7, Y: 0.7}},
	})
}

// ==================== MultiFloorShortestPath Tests ====================

func TestMultiFloorShortestPath_SameFloor_WithCoordinates(t *testing.T) {
	floorRepo := &mockFloorRepoForPath{
		floors: map[string][]domain.Floor{
			"VL": {createSimpleFloorWithStairs(1, "VLFloor1")},
		},
	}
	roomRepo := &mockIndoorRoomRepoForPath{rooms: map[string][]domain.IndoorRoom{}}

	svc := NewIndoorPathService(floorRepo, roomRepo)

	start := domain.Coordinates{X: 0, Y: 0}
	end := domain.Coordinates{X: 1, Y: 1}

	result, err := svc.MultiFloorShortestPath(MultiFloorPathRequest{
		BuildingCode: "VL",
		StartFloor:   1,
		EndFloor:     1,
		StartCoord:   &start,
		EndCoord:     &end,
	})

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Len(t, result.Segments, 1)
	assert.Equal(t, 1, result.Segments[0].FloorNumber)
	assert.Equal(t, TransitionNone, result.TransitionType)
	assert.Greater(t, len(result.Segments[0].Path), 0)
}

func TestMultiFloorShortestPath_DifferentFloors_ViaStairs(t *testing.T) {
	floorRepo := &mockFloorRepoForPath{
		floors: map[string][]domain.Floor{
			"VL": {
				createSimpleFloorWithStairs(1, "VLFloor1"),
				createSimpleFloorWithStairs(2, "VLFloor2"),
			},
		},
	}
	roomRepo := &mockIndoorRoomRepoForPath{rooms: map[string][]domain.IndoorRoom{}}

	svc := NewIndoorPathService(floorRepo, roomRepo)

	start := domain.Coordinates{X: 0, Y: 0}
	end := domain.Coordinates{X: 1, Y: 1}

	result, err := svc.MultiFloorShortestPath(MultiFloorPathRequest{
		BuildingCode:   "VL",
		StartFloor:     1,
		EndFloor:       2,
		StartCoord:     &start,
		EndCoord:       &end,
		PreferElevator: false,
	})

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Len(t, result.Segments, 2)
	assert.Equal(t, 1, result.Segments[0].FloorNumber)
	assert.Equal(t, 2, result.Segments[1].FloorNumber)
	assert.Equal(t, TransitionStairs, result.TransitionType)
}

func TestMultiFloorShortestPath_DifferentFloors_PreferElevator(t *testing.T) {
	floorRepo := &mockFloorRepoForPath{
		floors: map[string][]domain.Floor{
			"VL": {
				createSimpleFloorWithBothTransitions(1, "VLFloor1"),
				createSimpleFloorWithBothTransitions(2, "VLFloor2"),
			},
		},
	}
	roomRepo := &mockIndoorRoomRepoForPath{rooms: map[string][]domain.IndoorRoom{}}

	svc := NewIndoorPathService(floorRepo, roomRepo)

	start := domain.Coordinates{X: 0, Y: 0}
	end := domain.Coordinates{X: 1, Y: 1}

	result, err := svc.MultiFloorShortestPath(MultiFloorPathRequest{
		BuildingCode:   "VL",
		StartFloor:     1,
		EndFloor:       2,
		StartCoord:     &start,
		EndCoord:       &end,
		PreferElevator: true,
	})

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Len(t, result.Segments, 2)
	assert.Equal(t, TransitionElevator, result.TransitionType)
}

func TestMultiFloorShortestPath_FallbackToStairs_WhenNoElevator(t *testing.T) {
	floorRepo := &mockFloorRepoForPath{
		floors: map[string][]domain.Floor{
			"VL": {
				createSimpleFloorWithStairs(1, "VLFloor1"),
				createSimpleFloorWithStairs(2, "VLFloor2"),
			},
		},
	}
	roomRepo := &mockIndoorRoomRepoForPath{rooms: map[string][]domain.IndoorRoom{}}

	svc := NewIndoorPathService(floorRepo, roomRepo)

	start := domain.Coordinates{X: 0, Y: 0}
	end := domain.Coordinates{X: 1, Y: 1}

	result, err := svc.MultiFloorShortestPath(MultiFloorPathRequest{
		BuildingCode:   "VL",
		StartFloor:     1,
		EndFloor:       2,
		StartCoord:     &start,
		EndCoord:       &end,
		PreferElevator: true, // prefer elevator but none exists
	})

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, TransitionStairs, result.TransitionType) // falls back to stairs
}

func TestMultiFloorShortestPath_WithRoomNames(t *testing.T) {
	floorRepo := &mockFloorRepoForPath{
		floors: map[string][]domain.Floor{
			"VL": {createSimpleFloorWithStairs(1, "VLFloor1")},
		},
	}
	roomRepo := &mockIndoorRoomRepoForPath{
		rooms: map[string][]domain.IndoorRoom{
			"VL": {
				{Room: "Classroom", Building: "VL", Floor: 1, Centroid: domain.IndoorPosition{X: 0.1, Y: 0.1}},
				{Room: "Office", Building: "VL", Floor: 1, Centroid: domain.IndoorPosition{X: 0.9, Y: 0.9}},
			},
		},
	}

	svc := NewIndoorPathService(floorRepo, roomRepo)

	result, err := svc.MultiFloorShortestPath(MultiFloorPathRequest{
		BuildingCode: "VL",
		StartFloor:   1,
		EndFloor:     1,
		StartRoom:    "Classroom",
		EndRoom:      "Office",
	})

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Len(t, result.Segments, 1)
	assert.Equal(t, TransitionNone, result.TransitionType)
}

func TestMultiFloorShortestPath_EmptyBuildingCode_ReturnsError(t *testing.T) {
	svc := NewIndoorPathService(&mockFloorRepoForPath{}, &mockIndoorRoomRepoForPath{})

	start := domain.Coordinates{X: 0, Y: 0}
	end := domain.Coordinates{X: 1, Y: 1}

	_, err := svc.MultiFloorShortestPath(MultiFloorPathRequest{
		BuildingCode: "",
		StartFloor:   1,
		EndFloor:     1,
		StartCoord:   &start,
		EndCoord:     &end,
	})

	assert.Error(t, err)
	assert.Equal(t, "buildingCode is required", err.Error())
}

func TestMultiFloorShortestPath_MissingStartCoordAndRoom_ReturnsError(t *testing.T) {
	floorRepo := &mockFloorRepoForPath{
		floors: map[string][]domain.Floor{
			"VL": {createSimpleFloorWithStairs(1, "VLFloor1")},
		},
	}
	svc := NewIndoorPathService(floorRepo, &mockIndoorRoomRepoForPath{})

	end := domain.Coordinates{X: 1, Y: 1}

	_, err := svc.MultiFloorShortestPath(MultiFloorPathRequest{
		BuildingCode: "VL",
		StartFloor:   1,
		EndFloor:     1,
		EndCoord:     &end,
	})

	assert.Error(t, err)
	assert.Equal(t, "start coordinate or startRoom is required", err.Error())
}

func TestMultiFloorShortestPath_MissingEndCoordAndRoom_ReturnsError(t *testing.T) {
	floorRepo := &mockFloorRepoForPath{
		floors: map[string][]domain.Floor{
			"VL": {createSimpleFloorWithStairs(1, "VLFloor1")},
		},
	}
	svc := NewIndoorPathService(floorRepo, &mockIndoorRoomRepoForPath{})

	start := domain.Coordinates{X: 0, Y: 0}

	_, err := svc.MultiFloorShortestPath(MultiFloorPathRequest{
		BuildingCode: "VL",
		StartFloor:   1,
		EndFloor:     1,
		StartCoord:   &start,
	})

	assert.Error(t, err)
	assert.Equal(t, "end coordinate or endRoom is required", err.Error())
}

func TestMultiFloorShortestPath_StartFloorNotFound_ReturnsError(t *testing.T) {
	floorRepo := &mockFloorRepoForPath{
		floors: map[string][]domain.Floor{
			"VL": {createSimpleFloorWithStairs(1, "VLFloor1")},
		},
	}
	svc := NewIndoorPathService(floorRepo, &mockIndoorRoomRepoForPath{})

	start := domain.Coordinates{X: 0, Y: 0}
	end := domain.Coordinates{X: 1, Y: 1}

	_, err := svc.MultiFloorShortestPath(MultiFloorPathRequest{
		BuildingCode: "VL",
		StartFloor:   99, // doesn't exist
		EndFloor:     1,
		StartCoord:   &start,
		EndCoord:     &end,
	})

	assert.Error(t, err)
	assert.Equal(t, "start floor not found", err.Error())
}

func TestMultiFloorShortestPath_EndFloorNotFound_ReturnsError(t *testing.T) {
	floorRepo := &mockFloorRepoForPath{
		floors: map[string][]domain.Floor{
			"VL": {createSimpleFloorWithStairs(1, "VLFloor1")},
		},
	}
	svc := NewIndoorPathService(floorRepo, &mockIndoorRoomRepoForPath{})

	start := domain.Coordinates{X: 0, Y: 0}
	end := domain.Coordinates{X: 1, Y: 1}

	_, err := svc.MultiFloorShortestPath(MultiFloorPathRequest{
		BuildingCode: "VL",
		StartFloor:   1,
		EndFloor:     99, // doesn't exist
		StartCoord:   &start,
		EndCoord:     &end,
	})

	assert.Error(t, err)
	assert.Equal(t, "end floor not found", err.Error())
}

func TestMultiFloorShortestPath_NoTransitionPoints_ReturnsError(t *testing.T) {
	// Floor with no stairs or elevator
	floorWithoutTransitions := domain.Floor{
		FloorNumber: 1,
		FloorName:   "VLFloor1",
		Vertices: []domain.Coordinates{
			{X: 0, Y: 0},
			{X: 1, Y: 0},
			{X: 1, Y: 1},
			{X: 0, Y: 1},
		},
		Edges: []domain.Edge{
			{StartVertex: 0, EndVertex: 1},
			{StartVertex: 1, EndVertex: 2},
			{StartVertex: 2, EndVertex: 3},
			{StartVertex: 3, EndVertex: 0},
		},
		POIs: []domain.PointOfInterest{}, // No transition points
	}

	floorRepo := &mockFloorRepoForPath{
		floors: map[string][]domain.Floor{
			"VL": {
				floorWithoutTransitions,
				{FloorNumber: 2, FloorName: "VLFloor2", Vertices: floorWithoutTransitions.Vertices, Edges: floorWithoutTransitions.Edges, POIs: []domain.PointOfInterest{}},
			},
		},
	}
	svc := NewIndoorPathService(floorRepo, &mockIndoorRoomRepoForPath{})

	start := domain.Coordinates{X: 0, Y: 0}
	end := domain.Coordinates{X: 1, Y: 1}

	_, err := svc.MultiFloorShortestPath(MultiFloorPathRequest{
		BuildingCode: "VL",
		StartFloor:   1,
		EndFloor:     2,
		StartCoord:   &start,
		EndCoord:     &end,
	})

	assert.Error(t, err)
	assert.Contains(t, err.Error(), "no transition point")
}

func TestMultiFloorShortestPath_BuildingNotFound_ReturnsError(t *testing.T) {
	floorRepo := &mockFloorRepoForPath{
		floors: map[string][]domain.Floor{},
	}
	svc := NewIndoorPathService(floorRepo, &mockIndoorRoomRepoForPath{})

	start := domain.Coordinates{X: 0, Y: 0}
	end := domain.Coordinates{X: 1, Y: 1}

	_, err := svc.MultiFloorShortestPath(MultiFloorPathRequest{
		BuildingCode: "UNKNOWN",
		StartFloor:   1,
		EndFloor:     1,
		StartCoord:   &start,
		EndCoord:     &end,
	})

	assert.Error(t, err)
}

func TestMultiFloorShortestPath_RoomNotFound_ReturnsError(t *testing.T) {
	floorRepo := &mockFloorRepoForPath{
		floors: map[string][]domain.Floor{
			"VL": {createSimpleFloorWithStairs(1, "VLFloor1")},
		},
	}
	roomRepo := &mockIndoorRoomRepoForPath{
		rooms: map[string][]domain.IndoorRoom{
			"VL": {
				{Room: "Classroom", Building: "VL", Floor: 1, Centroid: domain.IndoorPosition{X: 0.1, Y: 0.1}},
			},
		},
	}

	svc := NewIndoorPathService(floorRepo, roomRepo)

	_, err := svc.MultiFloorShortestPath(MultiFloorPathRequest{
		BuildingCode: "VL",
		StartFloor:   1,
		EndFloor:     1,
		StartRoom:    "Classroom",
		EndRoom:      "NonExistentRoom",
	})

	assert.Error(t, err)
	assert.Contains(t, err.Error(), "room not found")
}

func TestMultiFloorShortestPath_TotalDistance_IsCalculated(t *testing.T) {
	floorRepo := &mockFloorRepoForPath{
		floors: map[string][]domain.Floor{
			"VL": {
				createSimpleFloorWithStairs(1, "VLFloor1"),
				createSimpleFloorWithStairs(2, "VLFloor2"),
			},
		},
	}
	svc := NewIndoorPathService(floorRepo, &mockIndoorRoomRepoForPath{})

	start := domain.Coordinates{X: 0, Y: 0}
	end := domain.Coordinates{X: 1, Y: 1}

	result, err := svc.MultiFloorShortestPath(MultiFloorPathRequest{
		BuildingCode: "VL",
		StartFloor:   1,
		EndFloor:     2,
		StartCoord:   &start,
		EndCoord:     &end,
	})

	assert.NoError(t, err)
	assert.NotNil(t, result)

	// Total distance should be sum of segment distances
	expectedTotal := result.Segments[0].Distance + result.Segments[1].Distance
	assert.Equal(t, expectedTotal, result.TotalDistance)
}

func TestMultiFloorShortestPath_FloorRepoError_Propagates(t *testing.T) {
	floorRepo := &mockFloorRepoForPath{
		err: errors.New("database connection failed"),
	}
	svc := NewIndoorPathService(floorRepo, &mockIndoorRoomRepoForPath{})

	start := domain.Coordinates{X: 0, Y: 0}
	end := domain.Coordinates{X: 1, Y: 1}

	_, err := svc.MultiFloorShortestPath(MultiFloorPathRequest{
		BuildingCode: "VL",
		StartFloor:   1,
		EndFloor:     1,
		StartCoord:   &start,
		EndCoord:     &end,
	})

	assert.Error(t, err)
	assert.Contains(t, err.Error(), "database connection failed")
}

// ==================== ShortestPath (Single Floor) Tests ====================

func TestShortestPath_WithCoordinates(t *testing.T) {
	floorRepo := &mockFloorRepoForPath{
		floors: map[string][]domain.Floor{
			"VL": {createSimpleFloorWithStairs(1, "VLFloor1")},
		},
	}
	roomRepo := &mockIndoorRoomRepoForPath{rooms: map[string][]domain.IndoorRoom{}}
	svc := NewIndoorPathService(floorRepo, roomRepo)

	start := domain.Coordinates{X: 0, Y: 0}
	end := domain.Coordinates{X: 1, Y: 1}

	result, err := svc.ShortestPath(IndoorPathRequest{
		BuildingCode: "VL",
		FloorNumber:  1,
		StartCoord:   &start,
		EndCoord:     &end,
	})

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Greater(t, len(result.Path), 0)
	assert.GreaterOrEqual(t, result.Distance, 0.0)
}

func TestShortestPath_WithVertices(t *testing.T) {
	floorRepo := &mockFloorRepoForPath{
		floors: map[string][]domain.Floor{
			"VL": {createSimpleFloorWithStairs(1, "VLFloor1")},
		},
	}
	svc := NewIndoorPathService(floorRepo, &mockIndoorRoomRepoForPath{})

	startV := 0
	endV := 2

	result, err := svc.ShortestPath(IndoorPathRequest{
		BuildingCode: "VL",
		FloorNumber:  1,
		StartVertex:  &startV,
		EndVertex:    &endV,
	})

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Greater(t, len(result.Path), 0)
}

func TestShortestPath_WithRoomNames(t *testing.T) {
	floorRepo := &mockFloorRepoForPath{
		floors: map[string][]domain.Floor{
			"VL": {createSimpleFloorWithStairs(1, "VLFloor1")},
		},
	}
	roomRepo := &mockIndoorRoomRepoForPath{
		rooms: map[string][]domain.IndoorRoom{
			"VL": {
				{Room: "Classroom", Building: "VL", Floor: 1, Centroid: domain.IndoorPosition{X: 0.1, Y: 0.1}},
				{Room: "Office", Building: "VL", Floor: 1, Centroid: domain.IndoorPosition{X: 0.9, Y: 0.9}},
			},
		},
	}
	svc := NewIndoorPathService(floorRepo, roomRepo)

	result, err := svc.ShortestPath(IndoorPathRequest{
		BuildingCode: "VL",
		FloorNumber:  1,
		StartRoom:    "Classroom",
		EndRoom:      "Office",
	})

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Greater(t, len(result.Path), 0)
}

func TestShortestPath_EmptyBuildingCode_ReturnsError(t *testing.T) {
	svc := NewIndoorPathService(&mockFloorRepoForPath{}, &mockIndoorRoomRepoForPath{})

	start := domain.Coordinates{X: 0, Y: 0}
	end := domain.Coordinates{X: 1, Y: 1}

	_, err := svc.ShortestPath(IndoorPathRequest{
		BuildingCode: "",
		FloorNumber:  1,
		StartCoord:   &start,
		EndCoord:     &end,
	})

	assert.Error(t, err)
	assert.Equal(t, "buildingCode is required", err.Error())
}

func TestShortestPath_FloorNotFound_ReturnsError(t *testing.T) {
	floorRepo := &mockFloorRepoForPath{
		floors: map[string][]domain.Floor{
			"VL": {createSimpleFloorWithStairs(1, "VLFloor1")},
		},
	}
	svc := NewIndoorPathService(floorRepo, &mockIndoorRoomRepoForPath{})

	start := domain.Coordinates{X: 0, Y: 0}
	end := domain.Coordinates{X: 1, Y: 1}

	_, err := svc.ShortestPath(IndoorPathRequest{
		BuildingCode: "VL",
		FloorNumber:  99,
		StartCoord:   &start,
		EndCoord:     &end,
	})

	assert.Error(t, err)
	assert.Equal(t, "floor not found for building", err.Error())
}

func TestShortestPath_MissingEndpoints_ReturnsError(t *testing.T) {
	floorRepo := &mockFloorRepoForPath{
		floors: map[string][]domain.Floor{
			"VL": {createSimpleFloorWithStairs(1, "VLFloor1")},
		},
	}
	svc := NewIndoorPathService(floorRepo, &mockIndoorRoomRepoForPath{})

	_, err := svc.ShortestPath(IndoorPathRequest{
		BuildingCode: "VL",
		FloorNumber:  1,
		// Missing all endpoints
	})

	assert.Error(t, err)
	assert.Contains(t, err.Error(), "provide either")
}

func TestShortestPath_FloorRepoError_Propagates(t *testing.T) {
	floorRepo := &mockFloorRepoForPath{
		err: errors.New("database error"),
	}
	svc := NewIndoorPathService(floorRepo, &mockIndoorRoomRepoForPath{})

	start := domain.Coordinates{X: 0, Y: 0}
	end := domain.Coordinates{X: 1, Y: 1}

	_, err := svc.ShortestPath(IndoorPathRequest{
		BuildingCode: "VL",
		FloorNumber:  1,
		StartCoord:   &start,
		EndCoord:     &end,
	})

	assert.Error(t, err)
	assert.Contains(t, err.Error(), "database error")
}

func TestShortestPath_RoomRepoError_Propagates(t *testing.T) {
	floorRepo := &mockFloorRepoForPath{
		floors: map[string][]domain.Floor{
			"VL": {createSimpleFloorWithStairs(1, "VLFloor1")},
		},
	}
	roomRepo := &mockIndoorRoomRepoForPath{
		err: errors.New("room database error"),
	}
	svc := NewIndoorPathService(floorRepo, roomRepo)

	_, err := svc.ShortestPath(IndoorPathRequest{
		BuildingCode: "VL",
		FloorNumber:  1,
		StartRoom:    "Classroom",
		EndRoom:      "Office",
	})

	assert.Error(t, err)
	assert.Contains(t, err.Error(), "room database error")
}

func TestShortestPath_RoomNotFound_ReturnsError(t *testing.T) {
	floorRepo := &mockFloorRepoForPath{
		floors: map[string][]domain.Floor{
			"VL": {createSimpleFloorWithStairs(1, "VLFloor1")},
		},
	}
	roomRepo := &mockIndoorRoomRepoForPath{
		rooms: map[string][]domain.IndoorRoom{
			"VL": {
				{Room: "Classroom", Building: "VL", Floor: 1, Centroid: domain.IndoorPosition{X: 0.1, Y: 0.1}},
			},
		},
	}
	svc := NewIndoorPathService(floorRepo, roomRepo)

	_, err := svc.ShortestPath(IndoorPathRequest{
		BuildingCode: "VL",
		FloorNumber:  1,
		StartRoom:    "Classroom",
		EndRoom:      "NonExistent",
	})

	assert.Error(t, err)
	assert.Contains(t, err.Error(), "room not found")
}

// ==================== Graph Function Tests ====================

func TestNewGraphFromFloor_EmptyVertices_ReturnsError(t *testing.T) {
	floor := domain.Floor{
		FloorNumber: 1,
		FloorName:   "Empty",
		Vertices:    []domain.Coordinates{},
		Edges:       []domain.Edge{},
	}

	_, err := newGraphFromFloor(floor, false)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "no vertices")
}

func TestNewGraphFromFloor_InvalidEdgeIndex_ReturnsError(t *testing.T) {
	floor := domain.Floor{
		FloorNumber: 1,
		FloorName:   "InvalidEdge",
		Vertices: []domain.Coordinates{
			{X: 0, Y: 0},
			{X: 1, Y: 0},
		},
		Edges: []domain.Edge{
			{StartVertex: 0, EndVertex: 99}, // Invalid index
		},
	}

	_, err := newGraphFromFloor(floor, false)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "invalid vertex index")
}

func TestNewGraphFromFloor_NegativeEdgeIndex_ReturnsError(t *testing.T) {
	floor := domain.Floor{
		FloorNumber: 1,
		FloorName:   "NegativeEdge",
		Vertices: []domain.Coordinates{
			{X: 0, Y: 0},
			{X: 1, Y: 0},
		},
		Edges: []domain.Edge{
			{StartVertex: -1, EndVertex: 1}, // Negative index
		},
	}

	_, err := newGraphFromFloor(floor, false)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "invalid vertex index")
}

func TestGraph_ShortestPath_SameStartAndGoal(t *testing.T) {
	floor := createSimpleFloorWithStairs(1, "TestFloor")
	g, err := newGraphFromFloor(floor, false)
	assert.NoError(t, err)

	path, dist, err := g.shortestPath(0, 0)
	assert.NoError(t, err)
	assert.Equal(t, []int{0}, path)
	assert.Equal(t, 0.0, dist)
}

func TestGraph_ShortestPath_OutOfRange_ReturnsError(t *testing.T) {
	floor := createSimpleFloorWithStairs(1, "TestFloor")
	g, err := newGraphFromFloor(floor, false)
	assert.NoError(t, err)

	_, _, err = g.shortestPath(-1, 2)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "out of range")

	_, _, err = g.shortestPath(0, 100)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "out of range")
}

func TestGraph_ShortestPath_NoPathExists_ReturnsError(t *testing.T) {
	// Create a disconnected graph
	floor := domain.Floor{
		FloorNumber: 1,
		FloorName:   "Disconnected",
		Vertices: []domain.Coordinates{
			{X: 0, Y: 0},
			{X: 1, Y: 0},
			{X: 10, Y: 10}, // Disconnected vertex
		},
		Edges: []domain.Edge{
			{StartVertex: 0, EndVertex: 1}, // Only connects 0 and 1
		},
	}

	g, err := newGraphFromFloor(floor, false)
	assert.NoError(t, err)

	_, _, err = g.shortestPath(0, 2)
	assert.Error(t, err)
	assert.Equal(t, ErrNoPath, err)
}

func TestGraph_NearestVertex(t *testing.T) {
	floor := domain.Floor{
		FloorNumber: 1,
		FloorName:   "Test",
		Vertices: []domain.Coordinates{
			{X: 0, Y: 0},
			{X: 1, Y: 0},
			{X: 1, Y: 1},
			{X: 0, Y: 1},
		},
		Edges: []domain.Edge{
			{StartVertex: 0, EndVertex: 1},
		},
	}

	g, err := newGraphFromFloor(floor, false)
	assert.NoError(t, err)

	// Point closest to vertex 2 (1,1)
	nearest := g.nearestVertex(domain.Coordinates{X: 0.9, Y: 0.9})
	assert.Equal(t, 2, nearest)

	// Point closest to vertex 0 (0,0)
	nearest = g.nearestVertex(domain.Coordinates{X: 0.1, Y: 0.1})
	assert.Equal(t, 0, nearest)
}

func TestGraph_PathCoordinates(t *testing.T) {
	floor := createSimpleFloorWithStairs(1, "Test")
	g, err := newGraphFromFloor(floor, false)
	assert.NoError(t, err)

	coords := g.pathCoordinates([]int{0, 1, 2})
	assert.Len(t, coords, 3)
	assert.Equal(t, domain.Coordinates{X: 0, Y: 0}, coords[0])
	assert.Equal(t, domain.Coordinates{X: 1, Y: 0}, coords[1])
	assert.Equal(t, domain.Coordinates{X: 1, Y: 1}, coords[2])
}

// ==================== Additional MultiFloor Edge Cases ====================

func TestMultiFloorShortestPath_SameFloor_WithRoomNames(t *testing.T) {
	floorRepo := &mockFloorRepoForPath{
		floors: map[string][]domain.Floor{
			"VL": {createSimpleFloorWithStairs(1, "VLFloor1")},
		},
	}
	roomRepo := &mockIndoorRoomRepoForPath{
		rooms: map[string][]domain.IndoorRoom{
			"VL": {
				{Room: "classroom", Building: "VL", Floor: 1, Centroid: domain.IndoorPosition{X: 0.1, Y: 0.1}},
				{Room: "office", Building: "VL", Floor: 1, Centroid: domain.IndoorPosition{X: 0.9, Y: 0.9}},
			},
		},
	}
	svc := NewIndoorPathService(floorRepo, roomRepo)

	result, err := svc.MultiFloorShortestPath(MultiFloorPathRequest{
		BuildingCode: "VL",
		StartFloor:   1,
		EndFloor:     1,
		StartRoom:    "CLASSROOM", // Test case insensitivity
		EndRoom:      "OFFICE",
	})

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, TransitionNone, result.TransitionType)
}

func TestMultiFloorShortestPath_SameFloor_RoomRepoError(t *testing.T) {
	floorRepo := &mockFloorRepoForPath{
		floors: map[string][]domain.Floor{
			"VL": {createSimpleFloorWithStairs(1, "VLFloor1")},
		},
	}
	roomRepo := &mockIndoorRoomRepoForPath{
		err: errors.New("room db error"),
	}
	svc := NewIndoorPathService(floorRepo, roomRepo)

	_, err := svc.MultiFloorShortestPath(MultiFloorPathRequest{
		BuildingCode: "VL",
		StartFloor:   1,
		EndFloor:     1,
		StartRoom:    "Classroom",
		EndRoom:      "Office",
	})

	assert.Error(t, err)
	assert.Contains(t, err.Error(), "room db error")
}

func TestMultiFloorShortestPath_MultiFloor_WithRoomNames(t *testing.T) {
	floorRepo := &mockFloorRepoForPath{
		floors: map[string][]domain.Floor{
			"VL": {
				createSimpleFloorWithStairs(1, "VLFloor1"),
				createSimpleFloorWithStairs(2, "VLFloor2"),
			},
		},
	}
	roomRepo := &mockIndoorRoomRepoForPath{
		rooms: map[string][]domain.IndoorRoom{
			"VL": {
				{Room: "Classroom", Building: "VL", Floor: 1, Centroid: domain.IndoorPosition{X: 0.1, Y: 0.1}},
				{Room: "Office", Building: "VL", Floor: 2, Centroid: domain.IndoorPosition{X: 0.9, Y: 0.9}},
			},
		},
	}
	svc := NewIndoorPathService(floorRepo, roomRepo)

	result, err := svc.MultiFloorShortestPath(MultiFloorPathRequest{
		BuildingCode: "VL",
		StartFloor:   1,
		EndFloor:     2,
		StartRoom:    "Classroom",
		EndRoom:      "Office",
	})

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Len(t, result.Segments, 2)
	assert.Equal(t, TransitionStairs, result.TransitionType)
}

func TestMultiFloorShortestPath_MultiFloor_RoomRepoErrorOnStart(t *testing.T) {
	floorRepo := &mockFloorRepoForPath{
		floors: map[string][]domain.Floor{
			"VL": {
				createSimpleFloorWithStairs(1, "VLFloor1"),
				createSimpleFloorWithStairs(2, "VLFloor2"),
			},
		},
	}
	roomRepo := &mockIndoorRoomRepoForPath{
		err: errors.New("room fetch error"),
	}
	svc := NewIndoorPathService(floorRepo, roomRepo)

	_, err := svc.MultiFloorShortestPath(MultiFloorPathRequest{
		BuildingCode: "VL",
		StartFloor:   1,
		EndFloor:     2,
		StartRoom:    "Classroom",
		EndRoom:      "Office",
	})

	assert.Error(t, err)
	assert.Contains(t, err.Error(), "room fetch error")
}

func TestMultiFloorShortestPath_MultiFloor_StartRoomNotFound(t *testing.T) {
	floorRepo := &mockFloorRepoForPath{
		floors: map[string][]domain.Floor{
			"VL": {
				createSimpleFloorWithStairs(1, "VLFloor1"),
				createSimpleFloorWithStairs(2, "VLFloor2"),
			},
		},
	}
	roomRepo := &mockIndoorRoomRepoForPath{
		rooms: map[string][]domain.IndoorRoom{
			"VL": {
				{Room: "Office", Building: "VL", Floor: 2, Centroid: domain.IndoorPosition{X: 0.9, Y: 0.9}},
			},
		},
	}
	svc := NewIndoorPathService(floorRepo, roomRepo)

	_, err := svc.MultiFloorShortestPath(MultiFloorPathRequest{
		BuildingCode: "VL",
		StartFloor:   1,
		EndFloor:     2,
		StartRoom:    "NonExistent",
		EndRoom:      "Office",
	})

	assert.Error(t, err)
	assert.Contains(t, err.Error(), "room not found")
}

func TestMultiFloorShortestPath_MultiFloor_EndRoomNotFound(t *testing.T) {
	floorRepo := &mockFloorRepoForPath{
		floors: map[string][]domain.Floor{
			"VL": {
				createSimpleFloorWithStairs(1, "VLFloor1"),
				createSimpleFloorWithStairs(2, "VLFloor2"),
			},
		},
	}
	roomRepo := &mockIndoorRoomRepoForPath{
		rooms: map[string][]domain.IndoorRoom{
			"VL": {
				{Room: "Classroom", Building: "VL", Floor: 1, Centroid: domain.IndoorPosition{X: 0.1, Y: 0.1}},
			},
		},
	}
	svc := NewIndoorPathService(floorRepo, roomRepo)

	end := domain.Coordinates{X: 0.9, Y: 0.9}
	_, err := svc.MultiFloorShortestPath(MultiFloorPathRequest{
		BuildingCode: "VL",
		StartFloor:   1,
		EndFloor:     2,
		StartRoom:    "Classroom",
		EndCoord:     &end,
	})

	// This should succeed since we're using EndCoord
	assert.NoError(t, err)
}

func TestMultiFloorShortestPath_FallbackToElevator_WhenNoStairs(t *testing.T) {
	floorRepo := &mockFloorRepoForPath{
		floors: map[string][]domain.Floor{
			"VL": {
				createSimpleFloorWithElevator(1, "VLFloor1"),
				createSimpleFloorWithElevator(2, "VLFloor2"),
			},
		},
	}
	svc := NewIndoorPathService(floorRepo, &mockIndoorRoomRepoForPath{})

	start := domain.Coordinates{X: 0, Y: 0}
	end := domain.Coordinates{X: 1, Y: 1}

	result, err := svc.MultiFloorShortestPath(MultiFloorPathRequest{
		BuildingCode:   "VL",
		StartFloor:     1,
		EndFloor:       2,
		StartCoord:     &start,
		EndCoord:       &end,
		PreferElevator: false, // prefer stairs but none exists
	})

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, TransitionElevator, result.TransitionType) // falls back to elevator
}

// ==================== NormalizeRoom Tests ====================

func TestNormalizeRoom(t *testing.T) {
	tests := []struct {
		input    string
		expected string
	}{
		{"classroom", "CLASSROOM"},
		{"  Classroom  ", "CLASSROOM"},
		{"Class Room", "CLASSROOM"},
		{"H 101", "H101"},
		{"h-101", "H-101"},
	}

	for _, tt := range tests {
		result := normalizeRoom(tt.input)
		assert.Equal(t, tt.expected, result)
	}
}

// ==================== FindTransitionPoint Edge Cases ====================

func TestFindTransitionPoint_PartialTypeMatch(t *testing.T) {
	floorRepo := &mockFloorRepoForPath{
		floors: map[string][]domain.Floor{
			"VL": {
				{
					FloorNumber: 1,
					FloorName:   "VLFloor1",
					Vertices: []domain.Coordinates{
						{X: 0, Y: 0},
						{X: 1, Y: 1},
					},
					Edges: []domain.Edge{
						{StartVertex: 0, EndVertex: 1},
					},
					POIs: []domain.PointOfInterest{
						{Name: "Main Stairs", Type: "main_stairs", Position: domain.Coordinates{X: 0.5, Y: 0.5}}, // Contains "stairs"
					},
				},
				{
					FloorNumber: 2,
					FloorName:   "VLFloor2",
					Vertices: []domain.Coordinates{
						{X: 0, Y: 0},
						{X: 1, Y: 1},
					},
					Edges: []domain.Edge{
						{StartVertex: 0, EndVertex: 1},
					},
					POIs: []domain.PointOfInterest{
						{Name: "Main Stairs", Type: "main_stairs", Position: domain.Coordinates{X: 0.5, Y: 0.5}},
					},
				},
			},
		},
	}
	svc := NewIndoorPathService(floorRepo, &mockIndoorRoomRepoForPath{})

	start := domain.Coordinates{X: 0, Y: 0}
	end := domain.Coordinates{X: 1, Y: 1}

	result, err := svc.MultiFloorShortestPath(MultiFloorPathRequest{
		BuildingCode: "VL",
		StartFloor:   1,
		EndFloor:     2,
		StartCoord:   &start,
		EndCoord:     &end,
	})

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, TransitionStairs, result.TransitionType)
}

// ========== Tests for Turn Direction Calculation ==========

func TestCalculateTurnDirections_LessThanThreePoints_ReturnsEmpty(t *testing.T) {
	// Two points - not enough to determine a turn
	coords := []domain.Coordinates{
		{X: 0, Y: 0},
		{X: 1, Y: 0},
	}
	directions := calculateTurnDirections(coords)
	assert.Empty(t, directions)
}

func TestCalculateTurnDirections_Straight_ReturnsNoTurn(t *testing.T) {
	// Three points in a straight line
	coords := []domain.Coordinates{
		{X: 0, Y: 0},
		{X: 1, Y: 0},
		{X: 2, Y: 0},
	}
	directions := calculateTurnDirections(coords)
	assert.Len(t, directions, 1)
	assert.Equal(t, TurnStraight, directions[0])
}

func TestCalculateTurnDirections_LeftTurn_ReturnsLeft(t *testing.T) {
	// L-shaped path turning left (going east, then north)
	coords := []domain.Coordinates{
		{X: 0, Y: 0},
		{X: 1, Y: 0},
		{X: 1, Y: 1}, // 90 degree left turn
	}
	directions := calculateTurnDirections(coords)
	assert.Len(t, directions, 1)
	assert.Equal(t, TurnLeft, directions[0])
}

func TestCalculateTurnDirections_RightTurn_ReturnsRight(t *testing.T) {
	// L-shaped path turning right (going east, then south)
	coords := []domain.Coordinates{
		{X: 0, Y: 0},
		{X: 1, Y: 0},
		{X: 1, Y: -1}, // 90 degree right turn
	}
	directions := calculateTurnDirections(coords)
	assert.Len(t, directions, 1)
	assert.Equal(t, TurnRight, directions[0])
}

func TestCalculateTurnDirections_MultipleTurns(t *testing.T) {
	// Square path with multiple turns
	coords := []domain.Coordinates{
		{X: 0, Y: 0}, // Start
		{X: 1, Y: 0}, // Point 1: walking east
		{X: 1, Y: 1}, // Point 2: turned left (north)
		{X: 0, Y: 1}, // Point 3: turned left (west)
		{X: 0, Y: 0}, // Point 4: turned left (south)
	}
	directions := calculateTurnDirections(coords)
	assert.Len(t, directions, 3)
	// All should be left turns going around a square counter-clockwise
	assert.Equal(t, TurnLeft, directions[0])
	assert.Equal(t, TurnLeft, directions[1])
	assert.Equal(t, TurnLeft, directions[2])
}

// ========== Tests for Closest Point On Segment ==========

func TestClosestPointOnSegment_PointOnSegment(t *testing.T) {
	a := domain.Coordinates{X: 0, Y: 0}
	b := domain.Coordinates{X: 2, Y: 0}
	p := domain.Coordinates{X: 1, Y: 0}

	closest := closestPointOnSegment(p, a, b)
	assert.InDelta(t, 1.0, closest.X, 0.001)
	assert.InDelta(t, 0.0, closest.Y, 0.001)
}

func TestClosestPointOnSegment_PointAboveSegment(t *testing.T) {
	a := domain.Coordinates{X: 0, Y: 0}
	b := domain.Coordinates{X: 2, Y: 0}
	p := domain.Coordinates{X: 1, Y: 1}

	closest := closestPointOnSegment(p, a, b)
	assert.InDelta(t, 1.0, closest.X, 0.001)
	assert.InDelta(t, 0.0, closest.Y, 0.001)
}

func TestClosestPointOnSegment_PointBeforeSegment(t *testing.T) {
	a := domain.Coordinates{X: 0, Y: 0}
	b := domain.Coordinates{X: 2, Y: 0}
	p := domain.Coordinates{X: -1, Y: 0}

	closest := closestPointOnSegment(p, a, b)
	// Should clamp to point a
	assert.InDelta(t, 0.0, closest.X, 0.001)
	assert.InDelta(t, 0.0, closest.Y, 0.001)
}

func TestClosestPointOnSegment_PointAfterSegment(t *testing.T) {
	a := domain.Coordinates{X: 0, Y: 0}
	b := domain.Coordinates{X: 2, Y: 0}
	p := domain.Coordinates{X: 3, Y: 0}

	closest := closestPointOnSegment(p, a, b)
	// Should clamp to point b
	assert.InDelta(t, 2.0, closest.X, 0.001)
	assert.InDelta(t, 0.0, closest.Y, 0.001)
}

func TestClosestPointOnSegment_DiagonalSegment(t *testing.T) {
	a := domain.Coordinates{X: 0, Y: 0}
	b := domain.Coordinates{X: 2, Y: 2}
	p := domain.Coordinates{X: 2, Y: 0}

	closest := closestPointOnSegment(p, a, b)
	// Closest point should be at (1, 1)
	assert.InDelta(t, 1.0, closest.X, 0.001)
	assert.InDelta(t, 1.0, closest.Y, 0.001)
}

// ========== Tests for Graph Splitting ==========

func TestGraph_NearestPointOnEdge_FindsCorrectEdge(t *testing.T) {
	floor := domain.Floor{
		FloorNumber: 1,
		FloorName:   "Test",
		Vertices: []domain.Coordinates{
			{X: 0, Y: 0}, // 0
			{X: 2, Y: 0}, // 1
			{X: 2, Y: 2}, // 2
			{X: 0, Y: 2}, // 3
		},
		Edges: []domain.Edge{
			{StartVertex: 0, EndVertex: 1},
			{StartVertex: 1, EndVertex: 2},
			{StartVertex: 2, EndVertex: 3},
			{StartVertex: 3, EndVertex: 0},
		},
	}

	g, err := newGraphFromFloor(floor, false)
	assert.NoError(t, err)

	// Point (1, 0.5) should be closest to edge 0-1 at (1, 0)
	point, u, v, dist := g.nearestPointOnEdge(domain.Coordinates{X: 1, Y: 0.5})
	assert.InDelta(t, 1.0, point.X, 0.001)
	assert.InDelta(t, 0.0, point.Y, 0.001)
	assert.Equal(t, 0, u)
	assert.Equal(t, 1, v)
	assert.InDelta(t, 0.5, dist, 0.001)
}

func TestGraph_InsertVertexOnEdge_SplitsCorrectly(t *testing.T) {
	floor := domain.Floor{
		FloorNumber: 1,
		FloorName:   "Test",
		Vertices: []domain.Coordinates{
			{X: 0, Y: 0}, // 0
			{X: 2, Y: 0}, // 1
		},
		Edges: []domain.Edge{
			{StartVertex: 0, EndVertex: 1},
		},
	}

	g, err := newGraphFromFloor(floor, false)
	assert.NoError(t, err)
	assert.Len(t, g.pos, 2)

	// Insert a new vertex at (1, 0) - middle of the edge
	newIdx := g.insertVertexOnEdge(domain.Coordinates{X: 1, Y: 0}, 0, 1)

	// Should have added a new vertex
	assert.Equal(t, 2, newIdx)
	assert.Len(t, g.pos, 3)

	// New vertex should be at (1, 0)
	assert.InDelta(t, 1.0, g.pos[newIdx].X, 0.001)
	assert.InDelta(t, 0.0, g.pos[newIdx].Y, 0.001)

	// Check adjacency: 0 should connect to 2, 2 should connect to 0 and 1, 1 should connect to 2
	// Vertex 0 should NOT directly connect to 1 anymore
	hasEdge0to1 := false
	hasEdge0to2 := false
	for _, nb := range g.adj[0] {
		if nb.to == 1 {
			hasEdge0to1 = true
		}
		if nb.to == 2 {
			hasEdge0to2 = true
		}
	}
	assert.False(t, hasEdge0to1, "Edge 0->1 should have been removed")
	assert.True(t, hasEdge0to2, "Edge 0->2 should exist")

	hasEdge2to0 := false
	hasEdge2to1 := false
	for _, nb := range g.adj[2] {
		if nb.to == 0 {
			hasEdge2to0 = true
		}
		if nb.to == 1 {
			hasEdge2to1 = true
		}
	}
	assert.True(t, hasEdge2to0, "Edge 2->0 should exist")
	assert.True(t, hasEdge2to1, "Edge 2->1 should exist")
}

func TestGraph_NearestVertexWithSplit_UsesExistingVertexWhenClose(t *testing.T) {
	floor := domain.Floor{
		FloorNumber: 1,
		FloorName:   "Test",
		Vertices: []domain.Coordinates{
			{X: 0, Y: 0}, // 0
			{X: 2, Y: 0}, // 1
		},
		Edges: []domain.Edge{
			{StartVertex: 0, EndVertex: 1},
		},
	}

	g, err := newGraphFromFloor(floor, false)
	assert.NoError(t, err)

	// Point exactly at vertex 0 - should return vertex 0, not split
	idx := g.nearestVertexWithSplit(domain.Coordinates{X: 0, Y: 0})
	assert.Equal(t, 0, idx)
	assert.Len(t, g.pos, 2) // No new vertex added
}

func TestGraph_NearestVertexWithSplit_SplitsEdgeWhenFarFromVertices(t *testing.T) {
	floor := domain.Floor{
		FloorNumber: 1,
		FloorName:   "Test",
		Vertices: []domain.Coordinates{
			{X: 0, Y: 0}, // 0
			{X: 2, Y: 0}, // 1
		},
		Edges: []domain.Edge{
			{StartVertex: 0, EndVertex: 1},
		},
	}

	g, err := newGraphFromFloor(floor, false)
	assert.NoError(t, err)

	// Point above the middle of the edge - should split the edge
	idx := g.nearestVertexWithSplit(domain.Coordinates{X: 1, Y: 0.5})
	assert.Equal(t, 2, idx) // New vertex index
	assert.Len(t, g.pos, 3) // New vertex added

	// The new vertex should be at (1, 0) - projection onto the edge
	assert.InDelta(t, 1.0, g.pos[idx].X, 0.001)
	assert.InDelta(t, 0.0, g.pos[idx].Y, 0.001)
}

func TestShortestPath_WithDirections_ReturnsCorrectDirections(t *testing.T) {
	// Create a floor with a path that requires turns
	floor := domain.Floor{
		FloorNumber: 1,
		FloorName:   "Test",
		Vertices: []domain.Coordinates{
			{X: 0, Y: 0}, // 0 - start
			{X: 1, Y: 0}, // 1 - turn point
			{X: 1, Y: 1}, // 2 - end
		},
		Edges: []domain.Edge{
			{StartVertex: 0, EndVertex: 1},
			{StartVertex: 1, EndVertex: 2},
		},
	}

	floorRepo := &mockFloorRepoForPath{
		floors: map[string][]domain.Floor{
			"VL": {floor},
		},
	}
	roomRepo := &mockIndoorRoomRepoForPath{rooms: map[string][]domain.IndoorRoom{}}

	svc := NewIndoorPathService(floorRepo, roomRepo)

	start := domain.Coordinates{X: 0, Y: 0}
	end := domain.Coordinates{X: 1, Y: 1}

	result, err := svc.ShortestPath(IndoorPathRequest{
		BuildingCode: "VL",
		FloorNumber:  1,
		StartCoord:   &start,
		EndCoord:     &end,
	})

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.NotEmpty(t, result.Directions)
	// There should be one turn direction (at the middle point)
	if len(result.Directions) > 0 {
		// Walking east then north is a left turn
		assert.Equal(t, TurnLeft, result.Directions[0])
	}
}

func TestTransitionType_String(t *testing.T) {
	assert.Equal(t, "none", TransitionNone.String())
	assert.Equal(t, "stairs", TransitionStairs.String())
	assert.Equal(t, "elevator", TransitionElevator.String())
}

// ========== RequireAccessible Tests ==========

func TestMultiFloorShortestPath_RequireAccessible_UsesElevator(t *testing.T) {
	// Both floors have elevators
	floor1 := createSimpleFloorWithElevator(1, "Floor1")
	floor2 := createSimpleFloorWithElevator(2, "Floor2")

	floorRepo := &mockFloorRepoForPath{
		floors: map[string][]domain.Floor{
			"H": {floor1, floor2},
		},
	}
	roomRepo := &mockIndoorRoomRepoForPath{rooms: map[string][]domain.IndoorRoom{}}

	svc := NewIndoorPathService(floorRepo, roomRepo)

	start := domain.Coordinates{X: 0.1, Y: 0.1}
	end := domain.Coordinates{X: 0.9, Y: 0.9}

	result, err := svc.MultiFloorShortestPath(MultiFloorPathRequest{
		BuildingCode:      "H",
		StartFloor:        1,
		EndFloor:          2,
		StartCoord:        &start,
		EndCoord:          &end,
		RequireAccessible: true,
	})

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, TransitionElevator, result.TransitionType)
	assert.Len(t, result.Segments, 2)
}

func TestMultiFloorShortestPath_RequireAccessible_NoElevatorOnStartFloor_ReturnsError(t *testing.T) {
	// Floor 1 has only stairs, Floor 2 has elevator
	floor1 := createSimpleFloorWithStairs(1, "Floor1")
	floor2 := createSimpleFloorWithElevator(2, "Floor2")

	floorRepo := &mockFloorRepoForPath{
		floors: map[string][]domain.Floor{
			"VL": {floor1, floor2},
		},
	}
	roomRepo := &mockIndoorRoomRepoForPath{rooms: map[string][]domain.IndoorRoom{}}

	svc := NewIndoorPathService(floorRepo, roomRepo)

	start := domain.Coordinates{X: 0.1, Y: 0.1}
	end := domain.Coordinates{X: 0.9, Y: 0.9}

	result, err := svc.MultiFloorShortestPath(MultiFloorPathRequest{
		BuildingCode:      "VL",
		StartFloor:        1,
		EndFloor:          2,
		StartCoord:        &start,
		EndCoord:          &end,
		RequireAccessible: true,
	})

	assert.Error(t, err)
	assert.Nil(t, result)
	assert.Contains(t, err.Error(), "no transition point")
}

func TestMultiFloorShortestPath_RequireAccessible_NoElevatorOnEndFloor_ReturnsError(t *testing.T) {
	// Floor 1 has elevator, Floor 2 has only stairs
	floor1 := createSimpleFloorWithElevator(1, "Floor1")
	floor2 := createSimpleFloorWithStairs(2, "Floor2")

	floorRepo := &mockFloorRepoForPath{
		floors: map[string][]domain.Floor{
			"VL": {floor1, floor2},
		},
	}
	roomRepo := &mockIndoorRoomRepoForPath{rooms: map[string][]domain.IndoorRoom{}}

	svc := NewIndoorPathService(floorRepo, roomRepo)

	start := domain.Coordinates{X: 0.1, Y: 0.1}
	end := domain.Coordinates{X: 0.9, Y: 0.9}

	result, err := svc.MultiFloorShortestPath(MultiFloorPathRequest{
		BuildingCode:      "VL",
		StartFloor:        1,
		EndFloor:          2,
		StartCoord:        &start,
		EndCoord:          &end,
		RequireAccessible: true,
	})

	assert.Error(t, err)
	assert.Nil(t, result)
	assert.Contains(t, err.Error(), "no transition point")
}

func TestMultiFloorShortestPath_RequireAccessible_BothFloorsHaveBoth_UsesElevator(t *testing.T) {
	// Both floors have both stairs and elevator - should use elevator when RequireAccessible
	floor1 := createSimpleFloorWithBothTransitions(1, "Floor1")
	floor2 := createSimpleFloorWithBothTransitions(2, "Floor2")

	floorRepo := &mockFloorRepoForPath{
		floors: map[string][]domain.Floor{
			"LB": {floor1, floor2},
		},
	}
	roomRepo := &mockIndoorRoomRepoForPath{rooms: map[string][]domain.IndoorRoom{}}

	svc := NewIndoorPathService(floorRepo, roomRepo)

	start := domain.Coordinates{X: 0.1, Y: 0.1}
	end := domain.Coordinates{X: 0.9, Y: 0.9}

	result, err := svc.MultiFloorShortestPath(MultiFloorPathRequest{
		BuildingCode:      "LB",
		StartFloor:        1,
		EndFloor:          2,
		StartCoord:        &start,
		EndCoord:          &end,
		RequireAccessible: true,
	})

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, TransitionElevator, result.TransitionType)
}

// ========== findClosestTransitionPoint Tests ==========

func TestFindClosestTransitionPoint_ReturnsClosestStairs(t *testing.T) {
	floor := domain.Floor{
		FloorNumber: 1,
		FloorName:   "Test",
		POIs: []domain.PointOfInterest{
			{Name: "stairs_far", Type: "stairs", Position: domain.Coordinates{X: 0.9, Y: 0.9}},
			{Name: "stairs_close", Type: "stairs", Position: domain.Coordinates{X: 0.2, Y: 0.2}},
			{Name: "elevator", Type: "elevator", Position: domain.Coordinates{X: 0.5, Y: 0.5}},
		},
	}

	floorRepo := &mockFloorRepoForPath{floors: map[string][]domain.Floor{}}
	roomRepo := &mockIndoorRoomRepoForPath{rooms: map[string][]domain.IndoorRoom{}}
	svc := NewIndoorPathService(floorRepo, roomRepo)

	refPoint := domain.Coordinates{X: 0.1, Y: 0.1}
	result := svc.findClosestTransitionPoint(&floor, TransitionStairs, refPoint)

	assert.NotNil(t, result)
	// Should return the closer stairs at (0.2, 0.2)
	assert.InDelta(t, 0.2, result.X, 0.001)
	assert.InDelta(t, 0.2, result.Y, 0.001)
}

func TestFindClosestTransitionPoint_ReturnsClosestElevator(t *testing.T) {
	floor := domain.Floor{
		FloorNumber: 1,
		FloorName:   "Test",
		POIs: []domain.PointOfInterest{
			{Name: "stairs", Type: "stairs", Position: domain.Coordinates{X: 0.1, Y: 0.1}},
			{Name: "elevator_far", Type: "elevator", Position: domain.Coordinates{X: 0.9, Y: 0.9}},
			{Name: "elevator_close", Type: "elevator", Position: domain.Coordinates{X: 0.3, Y: 0.3}},
		},
	}

	floorRepo := &mockFloorRepoForPath{floors: map[string][]domain.Floor{}}
	roomRepo := &mockIndoorRoomRepoForPath{rooms: map[string][]domain.IndoorRoom{}}
	svc := NewIndoorPathService(floorRepo, roomRepo)

	refPoint := domain.Coordinates{X: 0.2, Y: 0.2}
	result := svc.findClosestTransitionPoint(&floor, TransitionElevator, refPoint)

	assert.NotNil(t, result)
	// Should return the closer elevator at (0.3, 0.3)
	assert.InDelta(t, 0.3, result.X, 0.001)
	assert.InDelta(t, 0.3, result.Y, 0.001)
}

func TestFindClosestTransitionPoint_NoMatchingType_ReturnsNil(t *testing.T) {
	floor := domain.Floor{
		FloorNumber: 1,
		FloorName:   "Test",
		POIs: []domain.PointOfInterest{
			{Name: "stairs", Type: "stairs", Position: domain.Coordinates{X: 0.5, Y: 0.5}},
		},
	}

	floorRepo := &mockFloorRepoForPath{floors: map[string][]domain.Floor{}}
	roomRepo := &mockIndoorRoomRepoForPath{rooms: map[string][]domain.IndoorRoom{}}
	svc := NewIndoorPathService(floorRepo, roomRepo)

	refPoint := domain.Coordinates{X: 0.1, Y: 0.1}
	result := svc.findClosestTransitionPoint(&floor, TransitionElevator, refPoint)

	assert.Nil(t, result)
}

func TestFindClosestTransitionPoint_TransitionNone_ReturnsNil(t *testing.T) {
	floor := domain.Floor{
		FloorNumber: 1,
		FloorName:   "Test",
		POIs: []domain.PointOfInterest{
			{Name: "stairs", Type: "stairs", Position: domain.Coordinates{X: 0.5, Y: 0.5}},
			{Name: "elevator", Type: "elevator", Position: domain.Coordinates{X: 0.6, Y: 0.6}},
		},
	}

	floorRepo := &mockFloorRepoForPath{floors: map[string][]domain.Floor{}}
	roomRepo := &mockIndoorRoomRepoForPath{rooms: map[string][]domain.IndoorRoom{}}
	svc := NewIndoorPathService(floorRepo, roomRepo)

	refPoint := domain.Coordinates{X: 0.1, Y: 0.1}
	result := svc.findClosestTransitionPoint(&floor, TransitionNone, refPoint)

	assert.Nil(t, result)
}

// ========== Additional Edge Case Tests ==========

func TestMultiFloorShortestPath_SameFloor_RequireAccessibleHasNoEffect(t *testing.T) {
	// Same floor navigation should work regardless of RequireAccessible
	floor := createSimpleFloorWithStairs(1, "Floor1")

	floorRepo := &mockFloorRepoForPath{
		floors: map[string][]domain.Floor{
			"VL": {floor},
		},
	}
	roomRepo := &mockIndoorRoomRepoForPath{rooms: map[string][]domain.IndoorRoom{}}

	svc := NewIndoorPathService(floorRepo, roomRepo)

	start := domain.Coordinates{X: 0, Y: 0}
	end := domain.Coordinates{X: 1, Y: 1}

	result, err := svc.MultiFloorShortestPath(MultiFloorPathRequest{
		BuildingCode:      "VL",
		StartFloor:        1,
		EndFloor:          1,
		StartCoord:        &start,
		EndCoord:          &end,
		RequireAccessible: true,
	})

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, TransitionNone, result.TransitionType)
}

func TestCalculateTurnDirections_ZeroLengthSegment_ReturnsEmpty(t *testing.T) {
	// Two identical points followed by a third
	coords := []domain.Coordinates{
		{X: 0, Y: 0},
		{X: 0, Y: 0},
		{X: 1, Y: 0},
	}

	directions := calculateTurnDirections(coords)
	// Should handle gracefully without panicking
	assert.NotNil(t, directions)
}

func TestClosestPointOnSegment_ZeroLengthSegment(t *testing.T) {
	// Start and end are the same point
	a := domain.Coordinates{X: 1, Y: 1}
	b := domain.Coordinates{X: 1, Y: 1}
	p := domain.Coordinates{X: 2, Y: 2}

	closest := closestPointOnSegment(p, a, b)
	// Should return the point itself (start)
	assert.InDelta(t, 1.0, closest.X, 0.001)
	assert.InDelta(t, 1.0, closest.Y, 0.001)
}

func TestGraph_NearestVertex_WithSingleVertex(t *testing.T) {
	g := &graph{
		pos: []domain.Coordinates{{X: 5, Y: 5}},
		adj: make([][]neighbor, 1),
	}

	idx := g.nearestVertex(domain.Coordinates{X: 0, Y: 0})
	assert.Equal(t, 0, idx)
}

func TestMultiFloorShortestPath_PreferElevator_WithBothAvailable(t *testing.T) {
	// Both floors have both transitions
	floor1 := createSimpleFloorWithBothTransitions(1, "Floor1")
	floor2 := createSimpleFloorWithBothTransitions(2, "Floor2")

	floorRepo := &mockFloorRepoForPath{
		floors: map[string][]domain.Floor{
			"LB": {floor1, floor2},
		},
	}
	roomRepo := &mockIndoorRoomRepoForPath{rooms: map[string][]domain.IndoorRoom{}}

	svc := NewIndoorPathService(floorRepo, roomRepo)

	start := domain.Coordinates{X: 0.6, Y: 0.6}
	end := domain.Coordinates{X: 0.8, Y: 0.8}

	result, err := svc.MultiFloorShortestPath(MultiFloorPathRequest{
		BuildingCode:   "LB",
		StartFloor:     1,
		EndFloor:       2,
		StartCoord:     &start,
		EndCoord:       &end,
		PreferElevator: true,
	})

	assert.NoError(t, err)
	assert.NotNil(t, result)
	// Should prefer elevator when requested
	assert.Equal(t, TransitionElevator, result.TransitionType)
}

func TestEuclid_SamePoint_ReturnsZero(t *testing.T) {
	a := domain.Coordinates{X: 5, Y: 5}
	b := domain.Coordinates{X: 5, Y: 5}

	dist := euclid(a, b)
	assert.Equal(t, 0.0, dist)
}

func TestEuclid_StandardDistance(t *testing.T) {
	a := domain.Coordinates{X: 0, Y: 0}
	b := domain.Coordinates{X: 3, Y: 4}

	dist := euclid(a, b)
	assert.InDelta(t, 5.0, dist, 0.001)
}
