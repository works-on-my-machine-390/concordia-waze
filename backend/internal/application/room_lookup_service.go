package application

import (
	"errors"
	"fmt"
	"os"
	"strings"

	"github.com/works-on-my-machine-390/concordia-waze/internal/domain"
	"github.com/works-on-my-machine-390/concordia-waze/internal/persistence/repository"
)

type RoomLookupResult struct {
	Room            *domain.IndoorRoom `json:"room,omitempty"`
	BuildingCode    string             `json:"building_code"`
	BuildingLat     float64            `json:"building_latitude,omitempty"`
	BuildingLng     float64            `json:"building_longitude,omitempty"`
	FallbackToBuild bool               `json:"fallback_to_building"`
	Reason          string             `json:"reason,omitempty"`
}

type RoomLookupGetter interface {
	LookupRoomOrBuilding(building string, room string) (RoomLookupResult, error)
}

type roomLookupService struct {
	roomRepo     repository.IndoorRoomGetter
	buildingRepo BuildingReader
	floorRepo    FloorReader
}

func NewRoomLookupService(roomRepo repository.IndoorRoomGetter, buildingRepo BuildingReader, floorRepo FloorReader) RoomLookupGetter {
	return &roomLookupService{
		roomRepo:     roomRepo,
		buildingRepo: buildingRepo,
		floorRepo:    floorRepo,
	}
}

func (s *roomLookupService) LookupRoomOrBuilding(building string, room string) (RoomLookupResult, error) {
	if strings.TrimSpace(building) == "" {
		return RoomLookupResult{}, fmt.Errorf("building cannot be empty")
	}
	if strings.TrimSpace(room) == "" {
		return RoomLookupResult{}, fmt.Errorf("room cannot be empty")
	}

	b, err := s.buildingRepo.GetBuilding(building)
	if err != nil {
		return RoomLookupResult{}, err
	}

	result := RoomLookupResult{
		BuildingCode: strings.ToUpper(strings.TrimSpace(building)),
		BuildingLat:  b.Latitude,
		BuildingLng:  b.Longitude,
	}

	rooms, err := s.roomRepo.GetByBuilding(building)
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			result.FallbackToBuild = true
			result.Reason = "room_repository_not_mapped"
			return result, nil
		}
		return RoomLookupResult{}, err
	}

	target := strings.ToUpper(strings.TrimSpace(room))
	for _, r := range rooms {
		if strings.ToUpper(strings.TrimSpace(r.Room)) != target {
			continue
		}

		mapped, err := s.isFloorMapped(result.BuildingCode, r.Floor)
		if err != nil {
			return RoomLookupResult{}, err
		}
		if !mapped {
			result.FallbackToBuild = true
			result.Reason = "floor_not_mapped"
			return result, nil
		}

		roomCopy := r
		result.Room = &roomCopy
		result.FallbackToBuild = false
		return result, nil
	}

	result.FallbackToBuild = true
	result.Reason = "room_not_found"
	return result, nil
}

func (s *roomLookupService) isFloorMapped(building string, floor int) (bool, error) {
	floors, err := s.floorRepo.GetBuildingFloors(building)
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			return false, nil
		}
		return false, err
	}

	for _, f := range floors {
		if f.FloorNumber == floor {
			return true, nil
		}
	}

	return false, nil
}
