package application

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/works-on-my-machine-390/concordia-waze/internal/domain"
)

type fakeIndoorRepo struct {
	pois []domain.IndoorPOI
	err  error
}

func (f *fakeIndoorRepo) GetByBuilding(buildingCode string) ([]domain.IndoorPOI, error) {
	return f.pois, f.err
}

func TestIndoorPOIService_FiltersBySameFloorAndRadiusAndSorts(t *testing.T) {
	repo := &fakeIndoorRepo{
		pois: []domain.IndoorPOI{
			{ID: 1, Building: "MB", Floor: 0, Type: "stairs", Position: domain.IndoorPosition{X: 0, Y: 0}},
			{ID: 2, Building: "MB", Floor: 0, Type: "elevator", Position: domain.IndoorPosition{X: 3, Y: 4}}, // dist 5
			{ID: 3, Building: "MB", Floor: 1, Type: "bathroom", Position: domain.IndoorPosition{X: 1, Y: 1}}, // diff floor
			{ID: 4, Building: "MB", Floor: 0, Type: "lockers", Position: domain.IndoorPosition{X: 10, Y: 0}}, // dist 10
		},
	}

	svc := NewIndoorPointOfInterestService(repo)

	pois, err := svc.GetNearbyIndoorPOIs("MB", 0, 0, 0, 6, true, 10) // radius 6, sameFloor true
	assert.NoError(t, err)

	// Should include ID 1 (0), ID 2 (5). Exclude ID 4 (10) and ID 3 (floor 1)
	assert.Len(t, pois, 2)
	assert.Equal(t, 1, pois[0].ID) // nearest first
	assert.Equal(t, 2, pois[1].ID)
}

func TestIndoorPOIService_SameFloorFalseIncludesOtherFloors(t *testing.T) {
	repo := &fakeIndoorRepo{
		pois: []domain.IndoorPOI{
			{ID: 1, Building: "MB", Floor: 0, Type: "stairs", Position: domain.IndoorPosition{X: 0, Y: 0}},
			{ID: 2, Building: "MB", Floor: 1, Type: "bathroom", Position: domain.IndoorPosition{X: 1, Y: 1}},
		},
	}

	svc := NewIndoorPointOfInterestService(repo)

	pois, err := svc.GetNearbyIndoorPOIs("MB", 0, 0, 0, 5, false, 10)
	assert.NoError(t, err)
	assert.Len(t, pois, 2)
}

func TestIndoorPOIService_LimitApplies(t *testing.T) {
	repo := &fakeIndoorRepo{
		pois: []domain.IndoorPOI{
			{ID: 1, Building: "MB", Floor: 0, Type: "a", Position: domain.IndoorPosition{X: 0, Y: 0}},
			{ID: 2, Building: "MB", Floor: 0, Type: "b", Position: domain.IndoorPosition{X: 1, Y: 0}},
			{ID: 3, Building: "MB", Floor: 0, Type: "c", Position: domain.IndoorPosition{X: 2, Y: 0}},
		},
	}

	svc := NewIndoorPointOfInterestService(repo)

	pois, err := svc.GetNearbyIndoorPOIs("MB", 0, 0, 0, 100, true, 2)
	assert.NoError(t, err)
	assert.Len(t, pois, 2)
}

func TestIndoorPOIService_DefaultsApplied(t *testing.T) {
	repo := &fakeIndoorRepo{
		pois: []domain.IndoorPOI{
			{ID: 1, Building: "MB", Floor: 0, Type: "stairs", Position: domain.IndoorPosition{X: 0, Y: 0}},
		},
	}
	svc := NewIndoorPointOfInterestService(repo)

	// radius=0 and limit=0 should default to 40 and 30
	pois, err := svc.GetNearbyIndoorPOIs("MB", 0, 0, 0, 0, true, 0)
	assert.NoError(t, err)
	assert.Len(t, pois, 1)
}

func TestIndoorPOIService_EmptyBuildingReturnsError(t *testing.T) {
	repo := &fakeIndoorRepo{}
	svc := NewIndoorPointOfInterestService(repo)

	_, err := svc.GetNearbyIndoorPOIs("", 0, 0, 0, 10, true, 10)
	assert.Error(t, err)
}
