package application

import (
	"errors"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/works-on-my-machine-390/concordia-waze/internal/domain"
)

// fakePlacesClient implements google.PlacesClient for testing.
type fakePlacesClientPOI struct {
	// recorded inputs
	Input          string
	Lat            float64
	Lng            float64
	MaxDistance    int
	RankPreference string

	// response to return
	Places []domain.Building
	Err    error

	called bool
}

func (f *fakePlacesClientPOI) FindPlaceID(string, float64, float64) (string, error) {
	return "", nil
}

func (f *fakePlacesClientPOI) GetPhotoURLs(string) ([]string, error) {
	return nil, nil
}

func (f *fakePlacesClientPOI) GetOpeningHours(string) (domain.OpeningHours, error) {
	return nil, nil
}

func (f *fakePlacesClientPOI) TextSearchPlaces(input string, lat, lng float64, maxDistanceInMeters int, rankPreference string) ([]domain.Building, error) {
	f.called = true
	f.Input = input
	f.Lat = lat
	f.Lng = lng
	f.MaxDistance = maxDistanceInMeters
	f.RankPreference = rankPreference
	return f.Places, f.Err
}

func TestGetNearbyPointsOfInterest_EmptyInput(t *testing.T) {
	svc := NewPointOfInterestService(&fakePlacesClientPOI{})

	_, err := svc.GetNearbyPointsOfInterest("", 45.0, -73.0, 500, "RELEVANCE")
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "input cannot be empty")
}

func TestGetNearbyPointsOfInterest_Defaults(t *testing.T) {
	fake := &fakePlacesClientPOI{
		Places: []domain.Building{{Code: "1", Name: "A"}},
	}
	svc := NewPointOfInterestService(fake)

	places, err := svc.GetNearbyPointsOfInterest("cafe", 45.0, -73.0, 0, "")
	assert.NoError(t, err)
	assert.NotNil(t, places)
	assert.True(t, fake.called, "expected TextSearchPlaces to be called")
	assert.Equal(t, 1000, fake.MaxDistance, "expected default max distance to be 1000")
	assert.Equal(t, "DISTANCE", fake.RankPreference, "expected default rank preference to be DISTANCE")
}

func TestGetNearbyPointsOfInterest_Success(t *testing.T) {
	expected := []domain.Building{
		{Code: "P1", Name: "Place 1", Address: "Addr 1", Latitude: 45.0, Longitude: -73.0},
		{Code: "P2", Name: "Place 2", Address: "Addr 2", Latitude: 45.1, Longitude: -73.1},
	}
	fake := &fakePlacesClientPOI{Places: expected}
	svc := NewPointOfInterestService(fake)

	res, err := svc.GetNearbyPointsOfInterest("library", 45.0, -73.0, 1500, "RELEVANCE")
	assert.NoError(t, err)
	assert.Equal(t, expected, res)
	assert.True(t, fake.called)
	assert.Equal(t, "library", fake.Input)
	assert.Equal(t, 1500, fake.MaxDistance)
	assert.Equal(t, "RELEVANCE", fake.RankPreference)
}

func TestGetNearbyPointsOfInterest_PlacesError(t *testing.T) {
	fake := &fakePlacesClientPOI{Err: errors.New("google error")}
	svc := NewPointOfInterestService(fake)

	res, err := svc.GetNearbyPointsOfInterest("park", 45.0, -73.0, 500, "DISTANCE")
	assert.Error(t, err)
	assert.Nil(t, res)
	assert.True(t, fake.called)
}
