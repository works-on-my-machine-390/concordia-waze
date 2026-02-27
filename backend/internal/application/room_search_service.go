package application

import (
	"fmt"
	"strings"

	"github.com/works-on-my-machine-390/concordia-waze/internal/domain"
	"github.com/works-on-my-machine-390/concordia-waze/internal/persistence/repository"
)

type RoomSearchGetter interface {
	FindRoom(building string, room string, floor *int) (domain.IndoorRoom, error)
}

type roomSearchService struct {
	repo repository.IndoorRoomRepository
}

func NewRoomSearchService(repo repository.IndoorRoomRepository) RoomSearchGetter {
	return &roomSearchService{repo: repo}
}

func (s *roomSearchService) FindRoom(building string, room string, floor *int) (domain.IndoorRoom, error) {
	if strings.TrimSpace(building) == "" {
		return domain.IndoorRoom{}, fmt.Errorf("building cannot be empty")
	}
	if strings.TrimSpace(room) == "" {
		return domain.IndoorRoom{}, fmt.Errorf("room cannot be empty")
	}

	rooms, err := s.repo.GetByBuilding(building)
	if err != nil {
		return domain.IndoorRoom{}, err
	}

	target := strings.ToUpper(strings.TrimSpace(room))

	for _, r := range rooms {
		if floor != nil && r.Floor != *floor {
			continue
		}
		if strings.ToUpper(strings.TrimSpace(r.Room)) == target {
			return r, nil
		}
	}

	return domain.IndoorRoom{}, fmt.Errorf("room not found")
}
