package application

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/works-on-my-machine-390/concordia-waze/internal/domain"
	"github.com/works-on-my-machine-390/concordia-waze/internal/domain/request_format"
)

// --- Mocks ---
type MockFetcher struct{ mock.Mock }

func (m *MockFetcher) GetDirections(start, end domain.LatLng, mode []string) ([]domain.DirectionsResponse, error) {
	return []domain.DirectionsResponse{}, nil
}

func (m *MockFetcher) GetDirectionsWithSchedule(start, end domain.LatLng, mode []string, day, at string) ([]domain.DirectionsResponse, error) {
	args := m.Called(start, end, mode, day, at)

	if args.Get(0) == nil {
		return nil, args.Error(1)
	}

	return args.Get(0).([]domain.DirectionsResponse), args.Error(1)
}

type MockPathFinder struct{ mock.Mock }

func (m *MockPathFinder) ShortestPath(req IndoorPathRequest) (*IndoorPathResult, error) {
	return nil, nil
}

func (m *MockPathFinder) MultiFloorShortestPath(req MultiFloorPathRequest) (*MultiFloorPathResult, error) {
	args := m.Called(req)
	return args.Get(0).(*MultiFloorPathResult), args.Error(1)
}

type MockRepo struct{ mock.Mock }

func (m *MockRepo) GetByBuilding(code string) ([]domain.IndoorPOI, error) {
	args := m.Called(code)
	return args.Get(0).([]domain.IndoorPOI), args.Error(1)
}

type MockReader struct{ mock.Mock }

func (m *MockReader) GetAllBuildingsByCampus() (map[string][]domain.BuildingSummary, error) {
	return nil, nil
}

func (m *MockReader) GetBuilding(code string) (*domain.Building, error) {
	args := m.Called(code)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.Building), args.Error(1)
}

// --- Test Cases ---

func TestGetFullDirections_NilRequest(t *testing.T) {
	service := NewDirectionsRedirectorService(nil, nil, nil, nil)
	res, err := service.GetFullDirections(nil)
	assert.Error(t, err)
	assert.Empty(t, res)
}

func TestGetFullDirections_WithinSameBuilding(t *testing.T) {
	mockPF := new(MockPathFinder)
	service := &directionsRedirectorService{indoorPathFinder: mockPF}

	floor := 1
	targetFloor := 2
	req := &request_format.RouteRequest{
		Start: request_format.RouteLocation{Building: "H", FloorNumber: &floor},
		End:   request_format.RouteLocation{Building: "H", FloorNumber: &targetFloor},
	}

	mockPF.On("MultiFloorShortestPath", mock.Anything).Return(&MultiFloorPathResult{TotalDistance: 100.0}, nil)

	res, err := service.GetFullDirections(req)

	assert.NoError(t, err)
	assert.Equal(t, "indoor", res[0].Type)
	assert.Equal(t, "duration", res[1].Type)
	mockPF.AssertExpectations(t)
}

func TestGetFullDirections_ComplexPath(t *testing.T) {
	mockPF := new(MockPathFinder)
	mockRepo := new(MockRepo)
	mockFetcher := new(MockFetcher)
	mockReader := new(MockReader)

	service := NewDirectionsRedirectorService(mockFetcher, mockPF, mockRepo, mockReader)

	floor1, floor2 := 1, 5
	req := &request_format.RouteRequest{
		Start: request_format.RouteLocation{Building: "H", FloorNumber: &floor1, Latitude: 45.1, Longitude: -73.1},
		End:   request_format.RouteLocation{Building: "JMSB", FloorNumber: &floor2, Latitude: 45.2, Longitude: -73.2},
	}

	mockRepo.On("GetByBuilding", "H").Return([]domain.IndoorPOI{{Type: "exit", Floor: 1, Position: domain.IndoorPosition{X: 0, Y: 0}}}, nil)

	mockPF.On("MultiFloorShortestPath", mock.MatchedBy(func(r MultiFloorPathRequest) bool { return r.BuildingCode == "H" })).
		Return(&MultiFloorPathResult{TotalDistance: 10}, nil)

	mockFetcher.On("GetDirectionsWithSchedule",
		domain.LatLng{Lat: 45.1, Lng: -73.1},
		domain.LatLng{Lat: 45.2, Lng: -73.2},
		mock.Anything, mock.Anything, mock.Anything).
		Return([]domain.DirectionsResponse{{Duration: 300, Mode: "walking"}}, nil)

	mockRepo.On("GetByBuilding", "JMSB").Return([]domain.IndoorPOI{{Type: "exit", Floor: 1, Position: domain.IndoorPosition{X: 1, Y: 1}}}, nil)
	mockPF.On("MultiFloorShortestPath", mock.MatchedBy(func(r MultiFloorPathRequest) bool { return r.BuildingCode == "JMSB" })).
		Return(&MultiFloorPathResult{TotalDistance: 20}, nil)

	res, err := service.GetFullDirections(req)

	assert.NoError(t, err)
	assert.Len(t, res, 4)
	assert.Equal(t, "indoor", res[0].Type)
	assert.Equal(t, "outdoor", res[1].Type)
	assert.Equal(t, "indoor", res[2].Type)
	assert.Equal(t, "duration", res[3].Type)
}

func TestResolveLatLng_FallBackToBuilding(t *testing.T) {
	mockReader := new(MockReader)
	service := &directionsRedirectorService{buildingReader: mockReader}

	loc := &request_format.RouteLocation{Building: "H", Latitude: 0, Longitude: 0}
	mockReader.On("GetBuilding", "H").Return(&domain.Building{Latitude: 45.0, Longitude: -73.0}, nil)

	latLng, err := service.resolveLatLng(loc, "test")
	assert.NoError(t, err)
	assert.Equal(t, 45.0, latLng.Lat)
}

func TestGetDuration_Calculation(t *testing.T) {
	service := &directionsRedirectorService{}

	responses := []fullDirectionsResponse{
		{
			Type: "indoor",
			Body: &MultiFloorPathResult{TotalDistance: 142}, // 142 / 1.42 = 100
		},
		{
			Type: "outdoor",
			Body: []domain.DirectionsResponse{
				{Duration: 100, Mode: "walking"},
			},
		},
	}

	dur, err := service.GetDuration(responses)
	assert.NoError(t, err)
	// Walking: 100 (outdoor) + 100 (indoor) = 100
	assert.Equal(t, 200, dur["walking"])
}

func TestGetExitPoint_NoExitFound(t *testing.T) {
	mockRepo := new(MockRepo)
	service := &directionsRedirectorService{poiRepository: mockRepo}

	mockRepo.On("GetByBuilding", "VOID").Return([]domain.IndoorPOI{{Type: "washroom"}}, nil)

	pos, floor, err := service.getIndoorExitPoint(request_format.RouteLocation{Building: "VOID"})

	assert.Error(t, err)
	assert.Nil(t, pos)
	assert.Equal(t, 0, floor) // It's good practice to check the default int return too
	assert.Contains(t, err.Error(), "no exit POI found")

	mockRepo.AssertExpectations(t)
}

func TestWithinBuildingDirection_MissingFloorNumbers(t *testing.T) {
	mockPF := new(MockPathFinder)
	svc := &directionsRedirectorService{indoorPathFinder: mockPF}

	// start has floor nil
	start := request_format.RouteLocation{Building: "H"}
	endFloor := 2
	end := request_format.RouteLocation{Building: "H", FloorNumber: &endFloor}
	req := &request_format.RouteRequest{}

	res, err := svc.withinBuildingDirection(req, start, end)
	assert.Error(t, err)
	assert.Nil(t, res)
	assert.Contains(t, err.Error(), "start and end floor numbers are required for indoor routing")
}

func TestWithinBuildingDirection_SuccessCallsPathFinder(t *testing.T) {
	mockPF := new(MockPathFinder)
	mockPF.ExpectedCalls = nil
	service := &directionsRedirectorService{indoorPathFinder: mockPF}

	startFloor := 1
	endFloor := 2
	start := request_format.RouteLocation{Building: "H", FloorNumber: &startFloor, IndoorPosition: &domain.IndoorPosition{X: 1.1, Y: 2.2}}
	end := request_format.RouteLocation{Building: "H", FloorNumber: &endFloor, IndoorPosition: &domain.IndoorPosition{X: 3.3, Y: 4.4}}
	req := &request_format.RouteRequest{Preferences: request_format.RoutePreferences{PreferElevator: false, RequireAccessible: false}}

	mockPF.On("MultiFloorShortestPath", mock.MatchedBy(func(r MultiFloorPathRequest) bool {
		return r.BuildingCode == "H" && r.StartFloor == 1 && r.EndFloor == 2 && r.StartCoord != nil && r.EndCoord != nil
	})).Return(&MultiFloorPathResult{TotalDistance: 42.0}, nil)

	res, err := service.withinBuildingDirection(req, start, end)
	assert.NoError(t, err)
	assert.NotNil(t, res)
	assert.Equal(t, 42.0, res.TotalDistance)
	mockPF.AssertExpectations(t)
}
