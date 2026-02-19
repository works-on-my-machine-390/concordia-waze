package application

import (
	"errors"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/works-on-my-machine-390/concordia-waze/internal/domain"
)

// --- Fakes ---

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

// --- Helpers ---

func contains(s, sub string) bool {
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

// --- Tests ---

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
		times: []string{"00:01", "23:59"},
	}

	s := NewDirectionsService(f).WithShuttleRepo(shuttleRepo)

	start := domain.LatLng{Lat: 45.4973, Lng: -73.5790}
	end := domain.LatLng{Lat: 45.4582, Lng: -73.6405}

	resp, err := s.GetDirections(start, end, "shuttle")
	assert.NoError(t, err)

	assert.Equal(t, "shuttle", resp.Mode)
	assert.NotEmpty(t, resp.Steps)
	assert.GreaterOrEqual(t, len(resp.Steps), 3)

	foundShuttle := false
	for _, st := range resp.Steps {
		if contains(st.Instruction, "Shuttle") || contains(st.Instruction, "shuttle") {
			foundShuttle = true
			assert.NotEmpty(t, st.Distance)
			assert.NotEmpty(t, st.Duration)
			break
		}
	}
	assert.True(t, foundShuttle)

	assert.GreaterOrEqual(t, f.calls, 2)
	for _, m := range f.modes {
		assert.Equal(t, "walking", m)
	}

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

	shuttleRepo := &fakeShuttleRepo{err: errors.New("no schedule")}
	s := NewDirectionsService(f).WithShuttleRepo(shuttleRepo)

	resp, err := s.GetDirections(domain.LatLng{Lat: 1, Lng: 2}, domain.LatLng{Lat: 3, Lng: 4}, "shuttle")
	assert.NoError(t, err)
	assert.Equal(t, "shuttle", resp.Mode)
	assert.NotEmpty(t, resp.Steps)
}

func TestDirectionsService_GetDirectionsWithSchedule_NonShuttleWithUserTime(t *testing.T) {
	f := &fakeDirectionsClient{resp: domain.DirectionsResponse{Mode: "walking"}}
	s := NewDirectionsService(f)

	resp, err := s.GetDirectionsWithSchedule(domain.LatLng{}, domain.LatLng{}, "walking", "", "14:30")
	assert.NoError(t, err)
	assert.Contains(t, resp.DepartureMessage, "Depart at")
}

func TestParseOptionalDayTime_InvalidDayOrTime(t *testing.T) {
	_, _, err := parseOptionalDayTime("funday", "")
	assert.Error(t, err)
	assert.Equal(t, "invalid day", err.Error())

	_, _, err = parseOptionalDayTime("", "25:00")
	assert.Error(t, err)
	assert.Equal(t, "invalid time", err.Error())
}

func TestDirectionsService_GetShuttleDirectionsManual_InvalidInput(t *testing.T) {
	f := &fakeDirectionsClient{}
	s := NewDirectionsService(f).WithShuttleRepo(&fakeShuttleRepo{
		times: []string{"10:00"},
	})

	_, err := s.GetShuttleDirectionsManual(domain.LatLng{}, domain.LatLng{}, "funday", "10:00")
	assert.Error(t, err)

	_, err = s.GetShuttleDirectionsManual(domain.LatLng{}, domain.LatLng{}, "monday", "25:00")
	assert.Error(t, err)

	_, err = s.GetShuttleDirectionsManual(domain.LatLng{}, domain.LatLng{}, "monday", "11:00")
	assert.Error(t, err)
}

func TestPickNextDeparture_CoversBranches(t *testing.T) {
	now := time.Date(2026, 2, 18, 0, 20, 0, 0, time.UTC) // 00:20

	departures := []string{"00:24", "00:54", "01:24"} // your schedule

	next := pickNextDepartureAt(now, departures)

	assert.Equal(t, "00:24", next)
}

func TestParseGoogleDuration_CoversVariants(t *testing.T) {
	tests := []struct {
		input string
		want  time.Duration
	}{
		{"2 mins", 2 * time.Minute},
		{"1 min", 1 * time.Minute},
		{"1 hour", 1 * time.Hour},
		{"1 hour 5 mins", time.Hour + 5*time.Minute},
		{"2 hours 1 min", 2*time.Hour + time.Minute},
		{"", 0},
		{"garbage", 0},
	}

	for _, tt := range tests {
		got := parseGoogleDuration(tt.input)
		assert.Equal(t, tt.want, got, "input: %q", tt.input)
	}
}
