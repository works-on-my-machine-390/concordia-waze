package application

import (
	"errors"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/works-on-my-machine-390/concordia-waze/internal/domain"
)

type fakeDirectionsClient struct {
	resp domain.DirectionsResponse
	err  error

	calls    int
	lastMode string
	modes    []string

	lastStart domain.LatLng
	lastEnd   domain.LatLng
	starts    []domain.LatLng
	ends      []domain.LatLng
}

func (f *fakeDirectionsClient) GetDirections(start, end domain.LatLng, mode string) (domain.DirectionsResponse, error) {
	f.calls++
	f.lastMode = mode
	f.modes = append(f.modes, mode)

	f.lastStart = start
	f.lastEnd = end
	f.starts = append(f.starts, start)
	f.ends = append(f.ends, end)

	return f.resp, f.err
}

type fakeShuttleRepo struct {
	times []string
	err   error

	lastDay    string
	lastCampus string
}

func (r *fakeShuttleRepo) GetDepartures(day, campus string) ([]string, error) {
	r.lastDay = day
	r.lastCampus = campus
	if r.err != nil {
		return nil, r.err
	}
	out := make([]string, len(r.times))
	copy(out, r.times)
	return out, nil
}

func TestDirectionsService_DefaultModeWalking(t *testing.T) {
	f := &fakeDirectionsClient{resp: domain.DirectionsResponse{Mode: "walking"}}
	s := NewDirectionsService(f)

	_, err := s.GetDirections(domain.LatLng{Lat: 1, Lng: 2}, domain.LatLng{Lat: 3, Lng: 4}, "")
	assert.NoError(t, err)
	assert.Equal(t, "walking", f.lastMode)
}

func TestDirectionsService_RejectsInvalidMode(t *testing.T) {
	f := &fakeDirectionsClient{}
	s := NewDirectionsService(f)

	_, err := s.GetDirections(domain.LatLng{}, domain.LatLng{}, "plane")
	assert.Error(t, err)
	assert.Equal(t, "invalid mode", err.Error())
}

func TestDirectionsService_PassesValidModeAndNormalizes(t *testing.T) {
	f := &fakeDirectionsClient{resp: domain.DirectionsResponse{Mode: "transit"}}
	s := NewDirectionsService(f)

	_, err := s.GetDirections(domain.LatLng{}, domain.LatLng{}, "TRANSIT")
	assert.NoError(t, err)
	assert.Equal(t, "transit", f.lastMode)
}

func TestDirectionsService_PropagatesClientError(t *testing.T) {
	f := &fakeDirectionsClient{err: errors.New("boom")}
	s := NewDirectionsService(f)

	_, err := s.GetDirections(domain.LatLng{}, domain.LatLng{}, "walking")
	assert.Error(t, err)
	assert.Equal(t, "boom", err.Error())
}

func TestDirectionsService_ShuttleMode_ComposesWalkingLegsAndShuttleStep(t *testing.T) {
	// This fetcher should be called for walking legs when shuttle mode is used.
	f := &fakeDirectionsClient{
		resp: domain.DirectionsResponse{
			Mode: "walking",
			Polyline: []domain.LatLng{
				{Lat: 45.0, Lng: -73.0},
				{Lat: 45.1, Lng: -73.1},
			},
			Steps: []domain.DirectionStep{
				{Instruction: "Walk segment", Distance: "0.2 km", Duration: "2 mins"},
			},
		},
	}

	shuttleRepo := &fakeShuttleRepo{
		// ensure “next departure” branch can be taken
		times: []string{"00:01", "23:59"},
	}

	s := NewDirectionsService(f).WithShuttleRepo(shuttleRepo)

	start := domain.LatLng{Lat: 45.4973, Lng: -73.5790}
	end := domain.LatLng{Lat: 45.4582, Lng: -73.6405}

	resp, err := s.GetDirections(start, end, "shuttle")
	assert.NoError(t, err)

	// Should be shuttle overall
	assert.Equal(t, "shuttle", resp.Mode)
	assert.NotEmpty(t, resp.Steps)

	// We expect at least:
	// walk-to-stop steps + 1 shuttle step + walk-from-stop steps
	assert.GreaterOrEqual(t, len(resp.Steps), 3)

	// Shuttle step should have distance/duration filled (not empty)
	foundShuttle := false
	for _, st := range resp.Steps {
		if len(st.Instruction) > 0 && (contains(st.Instruction, "Shuttle") || contains(st.Instruction, "shuttle")) {
			foundShuttle = true
			assert.NotEmpty(t, st.Distance)
			assert.NotEmpty(t, st.Duration)
			break
		}
	}
	assert.True(t, foundShuttle, "expected a shuttle step to be included")

	// Fetcher should have been called for walking legs (usually 2 times)
	assert.GreaterOrEqual(t, f.calls, 2)
	for _, m := range f.modes {
		// walking legs only
		assert.Equal(t, "walking", m)
	}

	// Shuttle repo should be queried for SGW (based on your implementation)
	// day will depend on current weekday, so we just assert campus is set.
	assert.NotEmpty(t, shuttleRepo.lastCampus)
}

func TestDirectionsService_ShuttleMode_StillWorksWhenRepoMissingOrErrors(t *testing.T) {
	f := &fakeDirectionsClient{
		resp: domain.DirectionsResponse{
			Mode: "walking",
			Steps: []domain.DirectionStep{
				{Instruction: "Walk segment", Distance: "0.2 km", Duration: "2 mins"},
			},
		},
	}

	// repo returns error => should still succeed with fallback text
	shuttleRepo := &fakeShuttleRepo{err: errors.New("no schedule")}

	s := NewDirectionsService(f).WithShuttleRepo(shuttleRepo)

	resp, err := s.GetDirections(domain.LatLng{Lat: 1, Lng: 2}, domain.LatLng{Lat: 3, Lng: 4}, "shuttle")
	assert.NoError(t, err)
	assert.Equal(t, "shuttle", resp.Mode)

	// ensures fallback branch does not crash
	assert.NotEmpty(t, resp.Steps)
}

func TestPickNextDeparture_CoversBranches(t *testing.T) {
	// This one is just to cover time parsing + next selection safely.
	// Depending on current time, we can still validate "no panic + returns something or empty".
	now := time.Now()

	// clearly earlier than now
	early := now.Add(-2 * time.Hour).Format("15:04")
	// clearly later than now
	late := now.Add(2 * time.Hour).Format("15:04")

	got := pickNextDeparture([]string{"bad", early, late})
	assert.Equal(t, late, got)

	got2 := pickNextDeparture([]string{"bad", early})
	assert.Equal(t, "", got2)
}

func contains(s, sub string) bool {
	// tiny helper to avoid importing strings everywhere
	if len(sub) == 0 {
		return true
	}
	if len(s) < len(sub) {
		return false
	}
	for i := 0; i+len(sub) <= len(s); i++ {
		if s[i:i+len(sub)] == sub {
			return true
		}
	}
	return false
}
