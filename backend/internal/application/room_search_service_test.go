package application

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/works-on-my-machine-390/concordia-waze/internal/domain"
)

type fakeRoomRepo struct {
	rooms []domain.IndoorRoom
	err   error
}

func (f *fakeRoomRepo) GetByBuilding(buildingCode string) ([]domain.IndoorRoom, error) {
	return f.rooms, f.err
}

func TestRoomSearchService_FindsRoomWithFloorFilter(t *testing.T) {
	repo := &fakeRoomRepo{
		rooms: []domain.IndoorRoom{
			{Room: "MB-101", Building: "MB", Floor: 0, Centroid: domain.IndoorPosition{X: 1, Y: 2}},
			{Room: "MB-101", Building: "MB", Floor: 1, Centroid: domain.IndoorPosition{X: 9, Y: 9}},
		},
	}

	svc := NewRoomSearchService(repo)

	f := 0
	got, err := svc.FindRoom("MB", "MB-101", &f)
	assert.NoError(t, err)
	assert.Equal(t, 0, got.Floor)
	assert.Equal(t, 1.0, got.Centroid.X)
}

func TestRoomSearchService_FindsRoomWithoutFloorFilter(t *testing.T) {
	repo := &fakeRoomRepo{
		rooms: []domain.IndoorRoom{
			{Room: "MB-101", Building: "MB", Floor: 0, Centroid: domain.IndoorPosition{X: 1, Y: 2}},
		},
	}
	svc := NewRoomSearchService(repo)

	got, err := svc.FindRoom("MB", "MB-101", nil)
	assert.NoError(t, err)
	assert.Equal(t, "MB-101", got.Room)
}

func TestRoomSearchService_NotFound(t *testing.T) {
	repo := &fakeRoomRepo{rooms: []domain.IndoorRoom{}}
	svc := NewRoomSearchService(repo)

	_, err := svc.FindRoom("MB", "MB-999", nil)
	assert.Error(t, err)
	assert.Equal(t, "room not found", err.Error())
}
