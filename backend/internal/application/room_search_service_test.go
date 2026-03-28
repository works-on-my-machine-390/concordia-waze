package application

import (
	"errors"
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

type fakeRoomSearchBuildingRepo struct {
	building *domain.Building
	err      error
}

func (f *fakeRoomSearchBuildingRepo) GetBuilding(code string) (*domain.Building, error) {
	if f.err != nil {
		return nil, f.err
	}
	if f.building == nil {
		return nil, domain.ErrBuildingNotFound
	}
	return f.building, nil
}

func (f *fakeRoomSearchBuildingRepo) GetAllBuildingsByCampus() (map[string][]domain.BuildingSummary, error) {
	return map[string][]domain.BuildingSummary{}, nil
}

type fakeRoomSearchFloorRepo struct {
	floors []domain.Floor
	err    error
}

func (f *fakeRoomSearchFloorRepo) GetBuildingFloors(code string) ([]domain.Floor, error) {
	if f.err != nil {
		return nil, f.err
	}
	return f.floors, nil
}

func (f *fakeRoomSearchFloorRepo) GetAllBuildingFloors() (map[string][]domain.Floor, error) {
	return map[string][]domain.Floor{}, nil
}

func newTestRoomSearchService(roomRepo *fakeRoomRepo) RoomSearchGetter {
	return NewRoomSearchService(
		roomRepo,
		&fakeRoomSearchBuildingRepo{building: &domain.Building{Code: "MB", LongName: "John Molson"}},
		&fakeRoomSearchFloorRepo{floors: []domain.Floor{{FloorNumber: 0}, {FloorNumber: 1}, {FloorNumber: -2}}},
	)
}

func TestRoomSearchService_FindsRoomWithFloorFilter(t *testing.T) {
	repo := &fakeRoomRepo{
		rooms: []domain.IndoorRoom{
			{Room: "S2.285", Building: "MB", Floor: 0, Centroid: domain.IndoorPosition{X: 1, Y: 2}},
			{Room: "S2.285", Building: "MB", Floor: 1, Centroid: domain.IndoorPosition{X: 9, Y: 9}},
		},
	}

	svc := newTestRoomSearchService(repo)

	f := 0
	got, err := svc.FindRoom("MB", "S2.285", &f)
	assert.NoError(t, err)
	assert.Equal(t, 0, got.Floor)
	assert.Equal(t, 1.0, got.Centroid.X)
}

func TestRoomSearchService_FindsRoomWithoutFloorFilter(t *testing.T) {
	repo := &fakeRoomRepo{
		rooms: []domain.IndoorRoom{
			{Room: "S2.273", Building: "MB", Floor: 0, Centroid: domain.IndoorPosition{X: 1, Y: 2}},
		},
	}
	svc := newTestRoomSearchService(repo)

	got, err := svc.FindRoom("MB", "s2.273", nil) // case-insensitive
	assert.NoError(t, err)
	assert.Equal(t, "S2.273", got.Room)
}

func TestRoomSearchService_NotFound(t *testing.T) {
	repo := &fakeRoomRepo{rooms: []domain.IndoorRoom{}}
	svc := newTestRoomSearchService(repo)

	_, err := svc.FindRoom("MB", "S2.999", nil)
	assert.Error(t, err)
	assert.Equal(t, "room not found", err.Error())
}

func TestRoomSearchService_EmptyBuilding_ReturnsError(t *testing.T) {
	svc := newTestRoomSearchService(&fakeRoomRepo{})
	_, err := svc.FindRoom("", "S2.285", nil)
	assert.Error(t, err)
}

func TestRoomSearchService_EmptyRoom_ReturnsError(t *testing.T) {
	svc := newTestRoomSearchService(&fakeRoomRepo{})
	_, err := svc.FindRoom("MB", "", nil)
	assert.Error(t, err)
}

func TestRoomSearchService_RepoError_Propagates(t *testing.T) {
	repo := &fakeRoomRepo{err: errors.New("repo failed")}
	svc := newTestRoomSearchService(repo)

	_, err := svc.FindRoom("MB", "S2.285", nil)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "repo failed")
}

func TestRoomSearchService_FindRoomOrDefaultToBuilding_RoomFound(t *testing.T) {
	repo := &fakeRoomRepo{rooms: []domain.IndoorRoom{{Room: "S2.285", Building: "MB", Floor: 0, Centroid: domain.IndoorPosition{X: 10, Y: 20}}}}
	buildingRepo := &fakeRoomSearchBuildingRepo{building: &domain.Building{Code: "MB", LongName: "John Molson", Latitude: 45.5, Longitude: -73.57}}
	floorRepo := &fakeRoomSearchFloorRepo{floors: []domain.Floor{{FloorNumber: 0}}}

	svc := NewRoomSearchService(repo, buildingRepo, floorRepo)
	result, err := svc.FindRoomOrDefaultToBuilding("MB", "S2.285")

	assert.NoError(t, err)
	assert.False(t, result.FallbackToBuilding)
	if assert.NotNil(t, result.Room) {
		assert.Equal(t, "S2.285", result.Room.Room)
	}
	assert.Equal(t, "MB - S2.285", result.Label)
	assert.Equal(t, "MB", result.BuildingCode)
	assert.Equal(t, 45.5, result.BuildingLat)
	assert.Equal(t, -73.57, result.BuildingLng)
}

func TestRoomSearchService_FindRoomOrDefaultToBuilding_RoomNotFoundFallsBack(t *testing.T) {
	repo := &fakeRoomRepo{rooms: []domain.IndoorRoom{{Room: "S2.273", Building: "MB", Floor: 0}}}
	buildingRepo := &fakeRoomSearchBuildingRepo{building: &domain.Building{Code: "MB", LongName: "John Molson", Latitude: 45.5, Longitude: -73.57}}
	floorRepo := &fakeRoomSearchFloorRepo{floors: []domain.Floor{{FloorNumber: 0}}}

	svc := NewRoomSearchService(repo, buildingRepo, floorRepo)
	result, err := svc.FindRoomOrDefaultToBuilding("MB", "S2.999")

	assert.NoError(t, err)
	assert.True(t, result.FallbackToBuilding)
	assert.Nil(t, result.Room)
	assert.Equal(t, domain.ErrRoomNotFound.Error(), result.Reason)
	assert.Equal(t, "MB - John Molson", result.Label)
	assert.Equal(t, "MB", result.BuildingCode)
}

func TestRoomSearchService_FindRoomOrDefaultToBuilding_FloorNotMappedFallsBack(t *testing.T) {
	repo := &fakeRoomRepo{rooms: []domain.IndoorRoom{{Room: "S2.285", Building: "MB", Floor: 0}}}
	buildingRepo := &fakeRoomSearchBuildingRepo{building: &domain.Building{Code: "MB", LongName: "John Molson"}}
	floorRepo := &fakeRoomSearchFloorRepo{floors: []domain.Floor{{FloorNumber: 1}}}

	svc := NewRoomSearchService(repo, buildingRepo, floorRepo)
	result, err := svc.FindRoomOrDefaultToBuilding("MB", "S2.285")

	assert.NoError(t, err)
	assert.True(t, result.FallbackToBuilding)
	assert.Nil(t, result.Room)
	assert.Equal(t, domain.ErrFloorNotMapped.Error(), result.Reason)
	assert.Equal(t, "MB - John Molson", result.Label)
}
