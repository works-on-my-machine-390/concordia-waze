package application

import (
	"errors"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/works-on-my-machine-390/concordia-waze/internal/constants"
)

type fakeShuttleReader struct {
	departures     []string
	departureData  map[string]map[string][]string
	errDepartures  error
	errData        error
	lastDay        string
	lastCampus     string
	getDataInvoked bool
}

func (f *fakeShuttleReader) GetDepartures(day, campus string) ([]string, error) {
	f.lastDay = day
	f.lastCampus = campus
	if f.errDepartures != nil {
		return nil, f.errDepartures
	}
	out := make([]string, len(f.departures))
	copy(out, f.departures)
	return out, nil
}

func (f *fakeShuttleReader) GetDepartureData() (map[string]map[string][]string, error) {
	f.getDataInvoked = true
	if f.errData != nil {
		return nil, f.errData
	}
	return f.departureData, nil
}

func TestShuttleServiceGetDeparturesSuccess(t *testing.T) {
	repo := &fakeShuttleReader{departures: []string{"08:00", "08:30"}}
	svc := NewShuttleService(repo)

	got, err := svc.GetDepartures("monday", "SGW")

	assert.NoError(t, err)
	assert.Equal(t, []string{"08:00", "08:30"}, got)
	assert.Equal(t, "monday", repo.lastDay)
	assert.Equal(t, "SGW", repo.lastCampus)
}

func TestShuttleServiceGetDeparturesError(t *testing.T) {
	repo := &fakeShuttleReader{errDepartures: errors.New("repo failure")}
	svc := NewShuttleService(repo)

	got, err := svc.GetDepartures("tuesday", "LOY")

	assert.Error(t, err)
	assert.Nil(t, got)
	assert.Equal(t, "repo failure", err.Error())
	assert.Equal(t, "tuesday", repo.lastDay)
	assert.Equal(t, "LOY", repo.lastCampus)
}

func TestShuttleServiceGetDepartureDataSuccess(t *testing.T) {
	expected := map[string]map[string][]string{
		"monday": {
			"SGW": {"09:00", "09:30"},
		},
	}
	repo := &fakeShuttleReader{departureData: expected}
	svc := NewShuttleService(repo)

	got, err := svc.GetDepartureData()

	assert.NoError(t, err)
	assert.True(t, repo.getDataInvoked)
	assert.Equal(t, expected, got)
}

func TestShuttleServiceGetDepartureDataError(t *testing.T) {
	repo := &fakeShuttleReader{errData: errors.New("data unavailable")}
	svc := NewShuttleService(repo)

	got, err := svc.GetDepartureData()

	assert.Error(t, err)
	assert.Nil(t, got)
	assert.Equal(t, "data unavailable", err.Error())
	assert.True(t, repo.getDataInvoked)
}

func TestShuttleServiceGetShuttleMarkerPositions(t *testing.T) {
	svc := NewShuttleService(&fakeShuttleReader{})

	positions := svc.GetShuttleMarkerPositions()

	assert.Contains(t, positions, "LOY")
	assert.Contains(t, positions, "SGW")

	assert.Equal(t, constants.LOYShuttleStopPosition.Lat, positions["LOY"]["lat"])
	assert.Equal(t, constants.LOYShuttleStopPosition.Lng, positions["LOY"]["lng"])
	assert.Equal(t, constants.SGWShuttleStopPosition.Lat, positions["SGW"]["lat"])
	assert.Equal(t, constants.SGWShuttleStopPosition.Lng, positions["SGW"]["lng"])
}
