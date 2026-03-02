package handler

import (
	"bytes"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/works-on-my-machine-390/concordia-waze/internal/application"
	"github.com/works-on-my-machine-390/concordia-waze/internal/domain"
)

// Mock implementations
type mockFloorRepo struct {
	floors map[string][]domain.Floor
	err    error
}

func (f *mockFloorRepo) GetBuildingFloors(code string) ([]domain.Floor, error) {
	if f.err != nil {
		return nil, f.err
	}
	floors, ok := f.floors[code]
	if !ok {
		return nil, errors.New("building not found")
	}
	return floors, nil
}

type mockIndoorRoomRepo struct {
	rooms map[string][]domain.IndoorRoom
	err   error
}

func (f *mockIndoorRoomRepo) GetByBuilding(buildingCode string) ([]domain.IndoorRoom, error) {
	if f.err != nil {
		return nil, f.err
	}
	rooms, ok := f.rooms[buildingCode]
	if !ok {
		return []domain.IndoorRoom{}, nil
	}
	return rooms, nil
}

// Helper to create test floors
func createTestFloorWithStairs(floorNum int, name string) domain.Floor {
	return domain.Floor{
		FloorNumber: floorNum,
		FloorName:   name,
		Vertices: []domain.Coordinates{
			{X: 0, Y: 0},
			{X: 1, Y: 0},
			{X: 1, Y: 1},
			{X: 0, Y: 1},
			{X: 0.5, Y: 0.5},
		},
		Edges: []domain.Edge{
			{StartVertex: 0, EndVertex: 1},
			{StartVertex: 1, EndVertex: 2},
			{StartVertex: 2, EndVertex: 3},
			{StartVertex: 3, EndVertex: 0},
			{StartVertex: 0, EndVertex: 4},
			{StartVertex: 1, EndVertex: 4},
			{StartVertex: 2, EndVertex: 4},
			{StartVertex: 3, EndVertex: 4},
		},
		POIs: []domain.PointOfInterest{
			{Name: "stairs_1", Type: "stairs", Position: domain.Coordinates{X: 0.5, Y: 0.5}},
		},
	}
}

func setupTestRouter(handler *IndoorPathHandler) *gin.Engine {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.POST("/directions/indoor/multi-floor-path", handler.GetMultiFloorShortestPath)
	return r
}

func TestGetMultiFloorShortestPath_InvalidJSON(t *testing.T) {
	floorRepo := &mockFloorRepo{floors: map[string][]domain.Floor{}}
	roomRepo := &mockIndoorRoomRepo{rooms: map[string][]domain.IndoorRoom{}}
	svc := application.NewIndoorPathService(floorRepo, roomRepo)
	handler := NewIndoorPathHandler(svc)

	r := setupTestRouter(handler)

	req := httptest.NewRequest(http.MethodPost, "/directions/indoor/multi-floor-path", bytes.NewBufferString("invalid json"))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	r.ServeHTTP(w, req)
	assert.Equal(t, http.StatusBadRequest, w.Code)
	assert.Contains(t, w.Body.String(), "invalid JSON body")
}

func TestGetMultiFloorShortestPath_MissingBuildingCode(t *testing.T) {
	floorRepo := &mockFloorRepo{floors: map[string][]domain.Floor{}}
	roomRepo := &mockIndoorRoomRepo{rooms: map[string][]domain.IndoorRoom{}}
	svc := application.NewIndoorPathService(floorRepo, roomRepo)
	handler := NewIndoorPathHandler(svc)

	r := setupTestRouter(handler)

	body := application.MultiFloorPathRequest{
		BuildingCode: "",
		StartFloor:   1,
		EndFloor:     1,
		StartCoord:   &domain.Coordinates{X: 0, Y: 0},
		EndCoord:     &domain.Coordinates{X: 1, Y: 1},
	}
	jsonBody, _ := json.Marshal(body)

	req := httptest.NewRequest(http.MethodPost, "/directions/indoor/multi-floor-path", bytes.NewBuffer(jsonBody))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	r.ServeHTTP(w, req)
	assert.Equal(t, http.StatusBadRequest, w.Code)
	assert.Contains(t, w.Body.String(), "buildingCode is required")
}

func TestGetMultiFloorShortestPath_SameFloor_Success(t *testing.T) {
	floorRepo := &mockFloorRepo{
		floors: map[string][]domain.Floor{
			"VL": {createTestFloorWithStairs(1, "VLFloor1")},
		},
	}
	roomRepo := &mockIndoorRoomRepo{rooms: map[string][]domain.IndoorRoom{}}
	svc := application.NewIndoorPathService(floorRepo, roomRepo)
	handler := NewIndoorPathHandler(svc)

	r := setupTestRouter(handler)

	body := application.MultiFloorPathRequest{
		BuildingCode: "VL",
		StartFloor:   1,
		EndFloor:     1,
		StartCoord:   &domain.Coordinates{X: 0, Y: 0},
		EndCoord:     &domain.Coordinates{X: 1, Y: 1},
	}
	jsonBody, _ := json.Marshal(body)

	req := httptest.NewRequest(http.MethodPost, "/directions/indoor/multi-floor-path", bytes.NewBuffer(jsonBody))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	r.ServeHTTP(w, req)
	assert.Equal(t, http.StatusOK, w.Code)

	var result application.MultiFloorPathResult
	err := json.Unmarshal(w.Body.Bytes(), &result)
	assert.NoError(t, err)
	assert.Len(t, result.Segments, 1)
	assert.Equal(t, application.TransitionNone, result.TransitionType)
}

func TestGetMultiFloorShortestPath_MultiFloor_Success(t *testing.T) {
	floorRepo := &mockFloorRepo{
		floors: map[string][]domain.Floor{
			"VL": {
				createTestFloorWithStairs(1, "VLFloor1"),
				createTestFloorWithStairs(2, "VLFloor2"),
			},
		},
	}
	roomRepo := &mockIndoorRoomRepo{rooms: map[string][]domain.IndoorRoom{}}
	svc := application.NewIndoorPathService(floorRepo, roomRepo)
	handler := NewIndoorPathHandler(svc)

	r := setupTestRouter(handler)

	body := application.MultiFloorPathRequest{
		BuildingCode:   "VL",
		StartFloor:     1,
		EndFloor:       2,
		StartCoord:     &domain.Coordinates{X: 0, Y: 0},
		EndCoord:       &domain.Coordinates{X: 1, Y: 1},
		PreferElevator: false,
	}
	jsonBody, _ := json.Marshal(body)

	req := httptest.NewRequest(http.MethodPost, "/directions/indoor/multi-floor-path", bytes.NewBuffer(jsonBody))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	r.ServeHTTP(w, req)
	assert.Equal(t, http.StatusOK, w.Code)

	var result application.MultiFloorPathResult
	err := json.Unmarshal(w.Body.Bytes(), &result)
	assert.NoError(t, err)
	assert.Len(t, result.Segments, 2)
	assert.Equal(t, application.TransitionStairs, result.TransitionType)
}

func TestGetMultiFloorShortestPath_FloorNotFound(t *testing.T) {
	floorRepo := &mockFloorRepo{
		floors: map[string][]domain.Floor{
			"VL": {createTestFloorWithStairs(1, "VLFloor1")},
		},
	}
	roomRepo := &mockIndoorRoomRepo{rooms: map[string][]domain.IndoorRoom{}}
	svc := application.NewIndoorPathService(floorRepo, roomRepo)
	handler := NewIndoorPathHandler(svc)

	r := setupTestRouter(handler)

	body := application.MultiFloorPathRequest{
		BuildingCode: "VL",
		StartFloor:   99,
		EndFloor:     1,
		StartCoord:   &domain.Coordinates{X: 0, Y: 0},
		EndCoord:     &domain.Coordinates{X: 1, Y: 1},
	}
	jsonBody, _ := json.Marshal(body)

	req := httptest.NewRequest(http.MethodPost, "/directions/indoor/multi-floor-path", bytes.NewBuffer(jsonBody))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	r.ServeHTTP(w, req)
	assert.Equal(t, http.StatusBadRequest, w.Code)
	assert.Contains(t, w.Body.String(), "start floor not found")
}

func TestGetMultiFloorShortestPath_BuildingNotFound(t *testing.T) {
	floorRepo := &mockFloorRepo{floors: map[string][]domain.Floor{}}
	roomRepo := &mockIndoorRoomRepo{rooms: map[string][]domain.IndoorRoom{}}
	svc := application.NewIndoorPathService(floorRepo, roomRepo)
	handler := NewIndoorPathHandler(svc)

	r := setupTestRouter(handler)

	body := application.MultiFloorPathRequest{
		BuildingCode: "UNKNOWN",
		StartFloor:   1,
		EndFloor:     1,
		StartCoord:   &domain.Coordinates{X: 0, Y: 0},
		EndCoord:     &domain.Coordinates{X: 1, Y: 1},
	}
	jsonBody, _ := json.Marshal(body)

	req := httptest.NewRequest(http.MethodPost, "/directions/indoor/multi-floor-path", bytes.NewBuffer(jsonBody))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	r.ServeHTTP(w, req)
	assert.Equal(t, http.StatusBadRequest, w.Code)
	assert.Contains(t, w.Body.String(), "building not found")
}

func TestGetMultiFloorShortestPath_MissingCoordinates(t *testing.T) {
	floorRepo := &mockFloorRepo{
		floors: map[string][]domain.Floor{
			"VL": {createTestFloorWithStairs(1, "VLFloor1")},
		},
	}
	roomRepo := &mockIndoorRoomRepo{rooms: map[string][]domain.IndoorRoom{}}
	svc := application.NewIndoorPathService(floorRepo, roomRepo)
	handler := NewIndoorPathHandler(svc)

	r := setupTestRouter(handler)

	body := application.MultiFloorPathRequest{
		BuildingCode: "VL",
		StartFloor:   1,
		EndFloor:     1,
		// Missing StartCoord and EndCoord
	}
	jsonBody, _ := json.Marshal(body)

	req := httptest.NewRequest(http.MethodPost, "/directions/indoor/multi-floor-path", bytes.NewBuffer(jsonBody))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	r.ServeHTTP(w, req)
	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestGetMultiFloorShortestPath_WithRoomNames(t *testing.T) {
	floorRepo := &mockFloorRepo{
		floors: map[string][]domain.Floor{
			"VL": {createTestFloorWithStairs(1, "VLFloor1")},
		},
	}
	roomRepo := &mockIndoorRoomRepo{
		rooms: map[string][]domain.IndoorRoom{
			"VL": {
				{Room: "Classroom", Building: "VL", Floor: 1, Centroid: domain.IndoorPosition{X: 0.1, Y: 0.1}},
				{Room: "Office", Building: "VL", Floor: 1, Centroid: domain.IndoorPosition{X: 0.9, Y: 0.9}},
			},
		},
	}
	svc := application.NewIndoorPathService(floorRepo, roomRepo)
	handler := NewIndoorPathHandler(svc)

	r := setupTestRouter(handler)

	body := application.MultiFloorPathRequest{
		BuildingCode: "VL",
		StartFloor:   1,
		EndFloor:     1,
		StartRoom:    "Classroom",
		EndRoom:      "Office",
	}
	jsonBody, _ := json.Marshal(body)

	req := httptest.NewRequest(http.MethodPost, "/directions/indoor/multi-floor-path", bytes.NewBuffer(jsonBody))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	r.ServeHTTP(w, req)
	assert.Equal(t, http.StatusOK, w.Code)

	var result application.MultiFloorPathResult
	err := json.Unmarshal(w.Body.Bytes(), &result)
	assert.NoError(t, err)
	assert.Equal(t, application.TransitionNone, result.TransitionType)
}

func TestNewIndoorPathHandler(t *testing.T) {
	floorRepo := &mockFloorRepo{floors: map[string][]domain.Floor{}}
	roomRepo := &mockIndoorRoomRepo{rooms: map[string][]domain.IndoorRoom{}}
	svc := application.NewIndoorPathService(floorRepo, roomRepo)

	handler := NewIndoorPathHandler(svc)
	assert.NotNil(t, handler)
}
