package application

import (
	"errors"
	"os"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/works-on-my-machine-390/concordia-waze/internal/domain"
)

type fakeBuildingReader struct {
	b   *domain.Building
	err error
}

func (f *fakeBuildingReader) GetBuilding(code string) (*domain.Building, error) {
	if f.err != nil {
		return nil, f.err
	}
	return f.b, nil
}

func (f *fakeBuildingReader) GetAllBuildingsByCampus() (map[string][]domain.BuildingSummary, error) {
	return nil, nil
}

type fakeFloorReader struct {
	floors []domain.Floor
	err    error
}

func (f *fakeFloorReader) GetBuildingFloors(code string) ([]domain.Floor, error) {
	if f.err != nil {
		return nil, f.err
	}
	return f.floors, nil
}

func (f *fakeFloorReader) GetAllBuildingFloors() (map[string][]domain.Floor, error) {
	return nil, nil
}

type fakeLookupRoomRepo struct {
	rooms []domain.IndoorRoom
	err   error
}

func (f *fakeLookupRoomRepo) GetByBuilding(buildingCode string) ([]domain.IndoorRoom, error) {
	if f.err != nil {
		return nil, f.err
	}
	return f.rooms, nil
}

func TestRoomLookupService_ReturnsRoom_WhenRoomAndFloorAreMapped(t *testing.T) {
	svc := NewRoomLookupService(
		&fakeLookupRoomRepo{rooms: []domain.IndoorRoom{{Room: "MB-101", Building: "MB", Floor: 1, Centroid: domain.IndoorPosition{X: 12, Y: 34}}}},
		&fakeBuildingReader{b: &domain.Building{Code: "MB", Latitude: 45.4971, Longitude: -73.5790}},
		&fakeFloorReader{floors: []domain.Floor{{FloorNumber: 1}}},
	)

	got, err := svc.LookupRoomOrBuilding("MB", "mb-101")
	assert.NoError(t, err)
	if assert.NotNil(t, got.Room) {
		assert.Equal(t, "MB-101", got.Room.Room)
		assert.Equal(t, 12.0, got.Room.Centroid.X)
		assert.Equal(t, 34.0, got.Room.Centroid.Y)
	}
	assert.False(t, got.FallbackToBuild)
}

func TestRoomLookupService_ReturnsBuildingFallback_WhenRoomNotFound(t *testing.T) {
	svc := NewRoomLookupService(
		&fakeLookupRoomRepo{rooms: []domain.IndoorRoom{}},
		&fakeBuildingReader{b: &domain.Building{Code: "MB", Latitude: 45.4971, Longitude: -73.5790}},
		&fakeFloorReader{floors: []domain.Floor{{FloorNumber: 1}}},
	)

	got, err := svc.LookupRoomOrBuilding("MB", "MB-999")
	assert.NoError(t, err)
	assert.Nil(t, got.Room)
	assert.True(t, got.FallbackToBuild)
	assert.Equal(t, "room_not_found", got.Reason)
	assert.Equal(t, 45.4971, got.BuildingLat)
	assert.Equal(t, -73.5790, got.BuildingLng)
}

func TestRoomLookupService_ReturnsBuildingFallback_WhenFloorNotMapped(t *testing.T) {
	svc := NewRoomLookupService(
		&fakeLookupRoomRepo{rooms: []domain.IndoorRoom{{Room: "MB-101", Building: "MB", Floor: 3}}},
		&fakeBuildingReader{b: &domain.Building{Code: "MB", Latitude: 45.4971, Longitude: -73.5790}},
		&fakeFloorReader{floors: []domain.Floor{{FloorNumber: 1}, {FloorNumber: 2}}},
	)

	got, err := svc.LookupRoomOrBuilding("MB", "MB-101")
	assert.NoError(t, err)
	assert.Nil(t, got.Room)
	assert.True(t, got.FallbackToBuild)
	assert.Equal(t, "floor_not_mapped", got.Reason)
}

func TestRoomLookupService_ReturnsBuildingFallback_WhenRoomRepoNotMapped(t *testing.T) {
	svc := NewRoomLookupService(
		&fakeLookupRoomRepo{err: os.ErrNotExist},
		&fakeBuildingReader{b: &domain.Building{Code: "MB", Latitude: 45.4971, Longitude: -73.5790}},
		&fakeFloorReader{floors: []domain.Floor{{FloorNumber: 1}}},
	)

	got, err := svc.LookupRoomOrBuilding("MB", "MB-101")
	assert.NoError(t, err)
	assert.Nil(t, got.Room)
	assert.True(t, got.FallbackToBuild)
	assert.Equal(t, "room_repository_not_mapped", got.Reason)
}

func TestRoomLookupService_ReturnsError_WhenBuildingMissing(t *testing.T) {
	svc := NewRoomLookupService(
		&fakeLookupRoomRepo{},
		&fakeBuildingReader{err: domain.ErrNotFound},
		&fakeFloorReader{},
	)

	_, err := svc.LookupRoomOrBuilding("BAD", "MB-101")
	assert.Error(t, err)
	assert.True(t, errors.Is(err, domain.ErrNotFound))
}

func TestRoomLookupService_ValidationErrors(t *testing.T) {
	svc := NewRoomLookupService(
		&fakeLookupRoomRepo{},
		&fakeBuildingReader{b: &domain.Building{Code: "MB"}},
		&fakeFloorReader{},
	)

	_, err := svc.LookupRoomOrBuilding("", "MB-101")
	assert.Error(t, err)

	_, err = svc.LookupRoomOrBuilding("MB", "")
	assert.Error(t, err)
}
