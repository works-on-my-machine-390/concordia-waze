package application

import (
	"fmt"
	"strings"

	"github.com/works-on-my-machine-390/concordia-waze/internal/domain"
	"github.com/works-on-my-machine-390/concordia-waze/internal/domain/request_format"
	"github.com/works-on-my-machine-390/concordia-waze/internal/persistence/repository"
)

type DirectionsRedirectorService interface {
	GetFullDirections(request *request_format.RouteRequest) ([]fullDirectionsResponse, error)
}

type directionsRedirectorService struct {
	outdoorService  *DirectionsService
	indoorService   *IndoorPathService
	buildingService *BuildingService
	poiRepository   repository.IndoorPOIRepository
}

func NewDirectionsRedirectorService(outdoorService *DirectionsService, indoorService *IndoorPathService, poiRepository repository.IndoorPOIRepository, buildingService *BuildingService) *directionsRedirectorService {
	return &directionsRedirectorService{
		outdoorService:  outdoorService,
		indoorService:   indoorService,
		poiRepository:   poiRepository,
		buildingService: buildingService,
	}
}

type fullDirectionsResponse struct {
	Type string `json:"type"`
	Body any    `json:"body"`
}

func (s *directionsRedirectorService) GetFullDirections(request *request_format.RouteRequest) ([]fullDirectionsResponse, error) {
	response := make([]fullDirectionsResponse, 0, 3)

	if request == nil {
		return response, fmt.Errorf("request cannot be nil")
	}

	start := request.Start
	end := request.End

	//indoor within same building
	if start.Building != "" && strings.EqualFold(strings.TrimSpace(start.Building), strings.TrimSpace(end.Building)) {
		if start.FloorNumber == nil || end.FloorNumber == nil {
			return response, fmt.Errorf("start and end floor numbers are required for indoor routing")
		}

		var mfReq = MultiFloorPathRequest{
			BuildingCode:      strings.ToUpper(strings.TrimSpace(start.Building)),
			StartFloor:        *start.FloorNumber,
			EndFloor:          *end.FloorNumber,
			StartRoom:         start.Room,
			EndRoom:           end.Room,
			PreferElevator:    request.Preferences.PreferElevator,
			RequireAccessible: request.Preferences.RequireAccessible,
		}

		if start.IndoorPosition != nil {
			mfReq.StartCoord = &domain.Coordinates{X: start.IndoorPosition.X, Y: start.IndoorPosition.Y}
		}

		res, err := s.indoorService.MultiFloorShortestPath(mfReq)
		if err != nil {
			return response, err
		}

		response = append(response, fullDirectionsResponse{Type: "indoor", Body: res})
		return response, nil
	}

	//if start is indoor get path to exit
	if start.FloorNumber != nil {
		res, err := s.GetExitDirection(request)
		if err != nil {
			return response, fmt.Errorf("failed to get exit directions for start location: %w", err)
		}
		response = append(response, fullDirectionsResponse{Type: "indoor", Body: res})

	}

	//get outdoor path from start to end
	outRes, err := s.getOutdoorDirections(request)
	if err != nil {
		return response, fmt.Errorf("failed to get outdoor directions: %w", err)
	}
	response = append(response, fullDirectionsResponse{Type: "outdoor", Body: outRes})

	// if end is indoor get path from exit to destination
	if end.FloorNumber != nil {

		res, err2 := s.GetPOIDirection(request)
		if err2 != nil {
			return response, fmt.Errorf("failed to get directions to POI for end location: %w", err2)
		}

		response = append(response, fullDirectionsResponse{Type: "indoor", Body: res})

	}
	return response, nil

}

// getIndoorExitPoint finds an 'exit' POI in the given building and optional floor.
func (s *directionsRedirectorService) getIndoorExitPoint(location request_format.RouteLocation) (*domain.IndoorPosition, int, error) {
	b := strings.ToUpper(strings.TrimSpace(location.Building))

	pois, err := s.poiRepository.GetByBuilding(b)
	if err != nil {
		return nil, 0, fmt.Errorf("tried to fetch POIs for building %s: %w", b, err)
	}

	for _, p := range pois {
		if strings.EqualFold(p.Type, "exit") {
			pos := p.Position
			return &pos, p.Floor, nil
		}
	}
	return nil, 0, fmt.Errorf("no exit POI found for building %s", b)
}

func (s *directionsRedirectorService) getOutdoorDirections(request *request_format.RouteRequest) ([]domain.DirectionsResponse, error) {
	startLatLng, err := s.resolveLatLng(&request.Start, "start")
	if err != nil {
		return nil, err
	}

	endLatLng, err := s.resolveLatLng(&request.End, "end")
	if err != nil {
		return nil, err
	}

	return s.outdoorService.GetDirectionsWithSchedule(
		startLatLng,
		endLatLng,
		request.Preferences.Mode,
		request.Preferences.Day,
		request.Preferences.Time,
	)
}

func (s *directionsRedirectorService) GetExitDirection(request *request_format.RouteRequest) (any, error) {
	start := request.Start

	exitPos, exitFloor, err := s.getIndoorExitPoint(start)
	if err != nil {
		return nil, fmt.Errorf("failed to find exit point for start location: %w", err)
	}

	var mfReq = MultiFloorPathRequest{
		BuildingCode:      strings.ToUpper(strings.TrimSpace(start.Building)),
		StartFloor:        *start.FloorNumber,
		EndFloor:          exitFloor,
		StartRoom:         start.Room,
		EndCoord:          &domain.Coordinates{X: exitPos.X, Y: exitPos.Y},
		PreferElevator:    request.Preferences.PreferElevator,
		RequireAccessible: request.Preferences.RequireAccessible,
	}

	if start.IndoorPosition != nil {
		mfReq.StartCoord = &domain.Coordinates{X: start.IndoorPosition.X, Y: start.IndoorPosition.Y}
	}

	res, err := s.indoorService.MultiFloorShortestPath(mfReq)
	if err != nil {
		return nil, fmt.Errorf("failed to get indoor path for start location: %w", err)
	}

	return res, nil

}

func (s *directionsRedirectorService) GetPOIDirection(request *request_format.RouteRequest) (any, error) {
	end := request.End

	exitPos, exitFloor, err := s.getIndoorExitPoint(end)
	if err != nil {
		return nil, fmt.Errorf("failed to find exit point for start location: %w", err)
	}

	var mfReq = MultiFloorPathRequest{
		BuildingCode:      strings.ToUpper(strings.TrimSpace(end.Building)),
		EndFloor:          *end.FloorNumber,
		StartFloor:        exitFloor,
		EndRoom:           end.Room,
		StartCoord:        &domain.Coordinates{X: exitPos.X, Y: exitPos.Y},
		PreferElevator:    request.Preferences.PreferElevator,
		RequireAccessible: request.Preferences.RequireAccessible,
	}

	if end.IndoorPosition != nil {
		mfReq.EndCoord = &domain.Coordinates{X: end.IndoorPosition.X, Y: end.IndoorPosition.Y}
	}

	res, err := s.indoorService.MultiFloorShortestPath(mfReq)
	if err != nil {
		return nil, fmt.Errorf("failed to get indoor path for start location: %w", err)
	}

	return res, nil

}

// Helper method to handle the coordinate latitude and longitude resolution for a given RouteLocation
func (s *directionsRedirectorService) resolveLatLng(location *request_format.RouteLocation, label string) (domain.LatLng, error) {
	if location.Longitude != 0 && location.Latitude != 0 {
		return domain.LatLng{Lat: location.Latitude, Lng: location.Longitude}, nil
	}

	building, err := s.buildingService.GetBuilding(location.Building)
	if err != nil || building == nil {
		return domain.LatLng{}, fmt.Errorf("invalid %s location: %w", label, err)
	}

	return domain.LatLng{Lat: building.Latitude, Lng: building.Longitude}, nil
}
