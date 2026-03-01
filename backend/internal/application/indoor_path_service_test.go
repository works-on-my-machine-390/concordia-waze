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

	_, err := newGraphFromFloor(floor)
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

	_, err := newGraphFromFloor(floor)
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

	_, err := newGraphFromFloor(floor)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "invalid vertex index")
}

func TestGraph_ShortestPath_SameStartAndGoal(t *testing.T) {
	floor := createSimpleFloorWithStairs(1, "TestFloor")
	g, err := newGraphFromFloor(floor)
	assert.NoError(t, err)

	path, dist, err := g.shortestPath(0, 0)
	assert.NoError(t, err)
	assert.Equal(t, []int{0}, path)
	assert.Equal(t, 0.0, dist)
}

func TestGraph_ShortestPath_OutOfRange_ReturnsError(t *testing.T) {
	floor := createSimpleFloorWithStairs(1, "TestFloor")
	g, err := newGraphFromFloor(floor)
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

	g, err := newGraphFromFloor(floor)
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

	g, err := newGraphFromFloor(floor)
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
	g, err := newGraphFromFloor(floor)
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
	assert.Equal(t, "none", result.TransitionType)
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
	assert.Equal(t, "stairs", result.TransitionType)
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
	assert.Equal(t, "elevator", result.TransitionType) // falls back to elevator
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
	assert.Equal(t, "stairs", result.TransitionType)
}
