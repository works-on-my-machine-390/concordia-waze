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

// Helper to create a simple floor graph (square with 4 vertices)
func createSimpleFloorWithStairs(floorNum int, name string) domain.Floor {
	vertices := []domain.Coordinates{
		{X: 0, Y: 0},     // 0: bottom-left
		{X: 1, Y: 0},     // 1: bottom-right
		{X: 1, Y: 1},     // 2: top-right
		{X: 0, Y: 1},     // 3: top-left
		{X: 0.5, Y: 0.5}, // 4: center (stairs location)
	}
	edges := []domain.Edge{
		{StartVertex: 0, EndVertex: 1},
		{StartVertex: 1, EndVertex: 2},
		{StartVertex: 2, EndVertex: 3},
		{StartVertex: 3, EndVertex: 0},
		{StartVertex: 0, EndVertex: 4},
		{StartVertex: 1, EndVertex: 4},
		{StartVertex: 2, EndVertex: 4},
		{StartVertex: 3, EndVertex: 4},
	}
	pois := []domain.PointOfInterest{
		{Name: "stairs_1", Type: "stairs", Position: domain.Coordinates{X: 0.5, Y: 0.5}},
	}
	return createTestFloor(floorNum, name, vertices, edges, pois)
}

func createSimpleFloorWithElevator(floorNum int, name string) domain.Floor {
	vertices := []domain.Coordinates{
		{X: 0, Y: 0},
		{X: 1, Y: 0},
		{X: 1, Y: 1},
		{X: 0, Y: 1},
		{X: 0.5, Y: 0.5},
	}
	edges := []domain.Edge{
		{StartVertex: 0, EndVertex: 1},
		{StartVertex: 1, EndVertex: 2},
		{StartVertex: 2, EndVertex: 3},
		{StartVertex: 3, EndVertex: 0},
		{StartVertex: 0, EndVertex: 4},
		{StartVertex: 1, EndVertex: 4},
		{StartVertex: 2, EndVertex: 4},
		{StartVertex: 3, EndVertex: 4},
	}
	pois := []domain.PointOfInterest{
		{Name: "elevator_1", Type: "elevator", Position: domain.Coordinates{X: 0.5, Y: 0.5}},
	}
	return createTestFloor(floorNum, name, vertices, edges, pois)
}

func createSimpleFloorWithBothTransitions(floorNum int, name string) domain.Floor {
	vertices := []domain.Coordinates{
		{X: 0, Y: 0},
		{X: 1, Y: 0},
		{X: 1, Y: 1},
		{X: 0, Y: 1},
		{X: 0.3, Y: 0.3}, // stairs
		{X: 0.7, Y: 0.7}, // elevator
	}
	edges := []domain.Edge{
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
	pois := []domain.PointOfInterest{
		{Name: "stairs_1", Type: "stairs", Position: domain.Coordinates{X: 0.3, Y: 0.3}},
		{Name: "elevator_1", Type: "elevator", Position: domain.Coordinates{X: 0.7, Y: 0.7}},
	}
	return createTestFloor(floorNum, name, vertices, edges, pois)
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
	assert.Equal(t, "none", result.TransitionType)
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
	assert.Equal(t, "stairs", result.TransitionType)
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
	assert.Equal(t, "elevator", result.TransitionType)
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
	assert.Equal(t, "stairs", result.TransitionType) // falls back to stairs
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
	assert.Equal(t, "none", result.TransitionType)
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
