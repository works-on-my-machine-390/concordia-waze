package application

import (
	"errors"
	"fmt"
	"strings"
	"unicode"

	"github.com/works-on-my-machine-390/concordia-waze/internal/domain"
	"github.com/works-on-my-machine-390/concordia-waze/internal/persistence/repository"
)

type RoomSearchGetter interface {
	FindRoom(building, room string, floor *int) (domain.IndoorRoom, error)
	FindRoomOrDefaultToBuilding(building, room string) (RoomSearchResult, error)
}

// Returns the room information if available, and if not, then default to the building it's in
// while providing an explanation of why the room lookup failed (e.g., "room not found").
type RoomSearchResult struct {
	Label              string             `json:"label"` // label to display while navigating, e.g. building code + room code if available, otherwise building code + building long name
	Room               *domain.IndoorRoom `json:"room,omitempty"`
	BuildingCode       string             `json:"building_code"`
	BuildingLat        float64            `json:"building_latitude,omitempty"`
	BuildingLng        float64            `json:"building_longitude,omitempty"`
	FallbackToBuilding bool               `json:"fallback_to_building"`
	Reason             string             `json:"reason,omitempty"`
}

var LABEL_STRUCTURE = "%s - %s" // building code - room code (if room found) or building long name (if room not found)

type roomSearchService struct {
	roomRepo     repository.IndoorRoomGetter
	buildingRepo BuildingReader
	floorRepo    FloorReader
}

func NewRoomSearchService(roomRepo repository.IndoorRoomGetter, buildingRepo BuildingReader, floorRepo FloorReader) RoomSearchGetter {
	return &roomSearchService{roomRepo: roomRepo, buildingRepo: buildingRepo, floorRepo: floorRepo}
}

func (s *roomSearchService) FindRoomOrDefaultToBuilding(building, room string) (RoomSearchResult, error) {

	// input validation
	if strings.TrimSpace(building) == "" {
		return RoomSearchResult{}, fmt.Errorf("building cannot be empty")
	}
	if strings.TrimSpace(room) == "" {
		return RoomSearchResult{}, fmt.Errorf("room cannot be empty")
	}

	// validate building exists
	b, err := s.buildingRepo.GetBuilding(building)
	if err != nil {
		return RoomSearchResult{
			Reason: domain.ErrBuildingNotFound.Error(),
		}, err
	}

	// append building info to start. if the room search fails, this is what is returned.
	result := RoomSearchResult{
		Label:        fmt.Sprintf(LABEL_STRUCTURE, strings.ToUpper(strings.TrimSpace(building)), b.LongName),
		BuildingCode: strings.ToUpper(strings.TrimSpace(building)),
		BuildingLat:  b.Latitude,
		BuildingLng:  b.Longitude,
	}

	// search for the room within the building
	rooms, err := s.roomRepo.GetByBuilding(building)
	if err != nil {
		return RoomSearchResult{}, err
	}
	target := room
	for _, r := range rooms {

		if !matchRoom(r, target, result.BuildingCode) {
			continue
		}

		mapped, err := s.isFloorMapped(result.BuildingCode, r.Floor)
		if err != nil {
			return RoomSearchResult{}, err
		}
		if !mapped {
			result.FallbackToBuilding = true
			result.Reason = domain.ErrFloorNotMapped.Error()
			return result, nil
		}

		// room found, return it with the building info
		roomCopy := r
		result.Room = &roomCopy
		result.Label = getRoomLabel(roomCopy, result.BuildingCode) // if room found, override label to be building code + room code
		result.FallbackToBuilding = false
		return result, nil
	}

	result.FallbackToBuilding = true
	result.Reason = domain.ErrRoomNotFound.Error()
	return result, nil
}

func (s *roomSearchService) isFloorMapped(building string, floor int) (bool, error) {
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

// normalizeRoomIdentifier removes all non-alphanumeric characters and converts to uppercase for consistent comparison
func normalizeRoomIdentifier(value string) string {
	var b strings.Builder

	for _, ch := range strings.ToUpper(strings.TrimSpace(value)) {
		if unicode.IsLetter(ch) || unicode.IsDigit(ch) {
			b.WriteRune(ch) // runes are Unicode code points, so this handles all letters/digits correctly
		}
	}

	return b.String()
}

func stripBuildingPrefix(roomID string, buildingCode string) string {
	if buildingCode == "" {
		return roomID
	}

	if strings.HasPrefix(roomID, buildingCode) && len(roomID) > len(buildingCode) {
		return roomID[len(buildingCode):]
	}

	return roomID
}

func matchRoom(r domain.IndoorRoom, target string, buildingCode string) bool {
	roomID := normalizeRoomIdentifier(r.Room)
	targetID := normalizeRoomIdentifier(target)
	buildingID := normalizeRoomIdentifier(buildingCode)

	if roomID == "" || targetID == "" {
		return false
	}

	if roomID == targetID {
		return true
	}

	roomWithoutBuilding := stripBuildingPrefix(roomID, buildingID)
	targetWithoutBuilding := stripBuildingPrefix(targetID, buildingID)

	return roomWithoutBuilding == targetWithoutBuilding ||
		roomWithoutBuilding == targetID ||
		roomID == targetWithoutBuilding
}

func getRoomLabel(room domain.IndoorRoom, buildingCode string) string {
	if room.Room != "" {
		roomValue := strings.TrimSpace(room.Room)

		buildingCodeUpperCase := strings.ToUpper(strings.TrimSpace(buildingCode))
		if strings.Contains(roomValue, ".") { // retain the dot if it's part of the room identifier (e.g., S2.285)
			return fmt.Sprintf(LABEL_STRUCTURE, buildingCodeUpperCase, roomValue)
		}

		return fmt.Sprintf(LABEL_STRUCTURE, buildingCodeUpperCase, normalizeRoomIdentifier(stripBuildingPrefix(roomValue, buildingCodeUpperCase)))
	}
	return ""
}

func (s *roomSearchService) FindRoom(building, room string, floor *int) (domain.IndoorRoom, error) {
	if strings.TrimSpace(building) == "" {
		return domain.IndoorRoom{}, fmt.Errorf("building cannot be empty")
	}
	if strings.TrimSpace(room) == "" {
		return domain.IndoorRoom{}, fmt.Errorf("room cannot be empty")
	}

	rooms, err := s.roomRepo.GetByBuilding(building)
	if err != nil {
		return domain.IndoorRoom{}, err
	}

	target := room

	for _, r := range rooms {
		if floor != nil && r.Floor != *floor {
			continue
		}
		if matchRoom(r, target, building) {
			return r, nil
		}
	}

	return domain.IndoorRoom{}, fmt.Errorf("room not found")
}
