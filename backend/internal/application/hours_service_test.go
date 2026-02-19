package application

import (
	"errors"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/works-on-my-machine-390/concordia-waze/internal/domain"
)

// fakeBuildingServiceRepo implements BuildingReader for tests.
type fakeBuildingServiceRepo struct {
	b   *domain.Building
	err error
}

func (f *fakeBuildingServiceRepo) GetBuilding(code string) (*domain.Building, error) {
	if f.err != nil {
		return nil, f.err
	}
	return f.b, nil
}

func (f *fakeBuildingServiceRepo) GetAllBuildingsByCampus() (map[string][]domain.BuildingSummary, error) {
	if f.err != nil {
		return nil, f.err
	}
	if f.b != nil {
		return map[string][]domain.BuildingSummary{
			"default": {
				{Code: f.b.Code, LongName: f.b.LongName},
			},
		}, nil
	}
	return map[string][]domain.BuildingSummary{}, nil
}

// fakePlaces implements the PlacesClient expected by HoursService in these tests.
type fakePlaces struct {
	placeID string
	hours   domain.OpeningHours
	err     error

	// control whether FindPlaceID should error
	findErr bool
	// control whether GetOpeningHours should error
	hoursErr bool
}

func (f *fakePlaces) FindPlaceID(name string, lat, lng float64) (string, error) {
	if f.findErr {
		return "", f.err
	}
	return f.placeID, nil
}

func (f *fakePlaces) GetOpeningHours(placeID string) (domain.OpeningHours, error) {
	if f.hoursErr {
		return nil, f.err
	}
	return f.hours, nil
}

func TestFetchOpeningHours_Success(t *testing.T) {
	repo := &fakeBuildingServiceRepo{
		b: &domain.Building{
			Code:      "LS",
			LongName:  "Learning Square",
			Latitude:  45.49,
			Longitude: -73.57,
		},
	}

	fp := &fakePlaces{
		placeID: "place123",
		hours: domain.OpeningHours{
			"monday":    {Open: "08:00", Close: "18:00"},
			"wednesday": {Open: "09:00", Close: "17:00"},
		},
	}

	// Construct a real BuildingService (backed by our fake repo) and pass its value into HoursService.
	buildingSvcPtr := NewBuildingService(repo, nil)
	buildingSvcVal := *buildingSvcPtr

	hsvc := NewHoursService(buildingSvcVal, fp)

	out, err := hsvc.FetchOpeningHours("LS")
	assert.NoError(t, err)
	assert.NotNil(t, out)

	// Returned building should be a copy with OpeningHours attached.
	assert.Equal(t, "LS", out.Code)
	assert.NotNil(t, out.OpeningHours)
	assert.Equal(t, "08:00", out.OpeningHours["monday"].Open)

	// Ensure original repo building was not mutated by FetchOpeningHours (we returned a copy).
	assert.Nil(t, repo.b.OpeningHours)
}

func TestFetchOpeningHours_GetBuildingError(t *testing.T) {
	repo := &fakeBuildingServiceRepo{
		err: errors.New("not found"),
	}
	// buildingSvc not used further if repo errors, but still construct it.
	buildingSvcPtr := NewBuildingService(repo, nil)
	buildingSvcVal := *buildingSvcPtr

	hsvc := NewHoursService(buildingSvcVal, &fakePlaces{})

	_, err := hsvc.FetchOpeningHours("MISSING")
	assert.Error(t, err)
}

func TestFetchOpeningHours_FindPlaceIDError(t *testing.T) {
	repo := &fakeBuildingServiceRepo{
		b: &domain.Building{
			Code:      "LS",
			LongName:  "Learning Square",
			Latitude:  45.49,
			Longitude: -73.57,
		},
	}

	fp := &fakePlaces{
		err:     errors.New("places find error"),
		findErr: true,
	}

	buildingSvcPtr := NewBuildingService(repo, nil)
	buildingSvcVal := *buildingSvcPtr

	hsvc := NewHoursService(buildingSvcVal, fp)

	_, err := hsvc.FetchOpeningHours("LS")
	assert.Error(t, err)
}

func TestFetchOpeningHours_GetOpeningHoursError(t *testing.T) {
	repo := &fakeBuildingServiceRepo{
		b: &domain.Building{
			Code:      "LS",
			LongName:  "Learning Square",
			Latitude:  45.49,
			Longitude: -73.57,
		},
	}

	fp := &fakePlaces{
		placeID:  "place123",
		err:      errors.New("opening hours error"),
		hoursErr: true,
	}

	buildingSvcPtr := NewBuildingService(repo, nil)
	buildingSvcVal := *buildingSvcPtr

	hsvc := NewHoursService(buildingSvcVal, fp)

	_, err := hsvc.FetchOpeningHours("LS")
	assert.Error(t, err)
}

func TestFetchOpeningHours_EmptyHours(t *testing.T) {
	repo := &fakeBuildingServiceRepo{
		b: &domain.Building{
			Code:      "LS",
			LongName:  "Learning Square",
			Latitude:  45.49,
			Longitude: -73.57,
		},
	}

	// Simulate Places returning an empty (but non-nil) OpeningHours map
	fp := &fakePlaces{
		placeID: "place123",
		hours:   domain.OpeningHours{},
	}

	buildingSvcPtr := NewBuildingService(repo, nil)
	buildingSvcVal := *buildingSvcPtr

	hsvc := NewHoursService(buildingSvcVal, fp)

	out, err := hsvc.FetchOpeningHours("LS")
	assert.NoError(t, err)
	assert.NotNil(t, out)
	// OpeningHours may be empty map; ensure it's present (empty) on returned copy
	if out.OpeningHours == nil {
		t.Fatalf("expected OpeningHours to be non-nil (may be empty), got nil")
	}
}
