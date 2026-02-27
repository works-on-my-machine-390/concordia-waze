package application

import (
	"errors"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/works-on-my-machine-390/concordia-waze/internal/domain"
)

const duration = "2 mins"

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

func TestDirectionsServiceDefaultModeWalking(t *testing.T) {
	f := &fakeDirectionsClient{resp: domain.DirectionsResponse{Mode: "walking"}}
	s := NewDirectionsService(f)

	_, err := s.GetDirections(domain.LatLng{Lat: 1, Lng: 2}, domain.LatLng{Lat: 3, Lng: 4}, "")
	assert.NoError(t, err)
	assert.Equal(t, "walking", f.lastMode)
}

func TestDirectionsServiceRejectsInvalidMode(t *testing.T) {
	f := &fakeDirectionsClient{}
	s := NewDirectionsService(f)

	_, err := s.GetDirections(domain.LatLng{}, domain.LatLng{}, "plane")
	assert.Error(t, err)
	assert.Equal(t, "invalid mode", err.Error())
}

func TestDirectionsServicePassesValidModeAndNormalizes(t *testing.T) {
	f := &fakeDirectionsClient{resp: domain.DirectionsResponse{Mode: "transit"}}
	s := NewDirectionsService(f)

	_, err := s.GetDirections(domain.LatLng{}, domain.LatLng{}, "TRANSIT")
	assert.NoError(t, err)
	assert.Equal(t, "transit", f.lastMode)
}

func TestDirectionsServicePropagatesClientError(t *testing.T) {
	f := &fakeDirectionsClient{err: errors.New("boom")}
	s := NewDirectionsService(f)

	_, err := s.GetDirections(domain.LatLng{}, domain.LatLng{}, "walking")
	assert.Error(t, err)
	assert.Equal(t, "boom", err.Error())
}

func TestDirectionsServiceShuttleModeComposesWalkingLegsAndShuttleStep(t *testing.T) {
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

func TestDirectionsServiceShuttleModeStillWorksWhenRepoMissingOrErrors(t *testing.T) {
	f := &fakeDirectionsClient{
		resp: domain.DirectionsResponse{
			Mode: "walking",
			Steps: []domain.DirectionStep{
				{Instruction: "Walk segment", Distance: "0.2 km", Duration: duration},
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

func TestDirectionsServiceGetDirectionsWithScheduleNonShuttleWithUserTime(t *testing.T) {
	f := &fakeDirectionsClient{resp: domain.DirectionsResponse{Mode: "walking"}}
	s := NewDirectionsService(f)

	resp, err := s.GetDirectionsWithSchedule(domain.LatLng{}, domain.LatLng{}, "walking", "", "14:30")
	assert.NoError(t, err)
	assert.Contains(t, resp.DepartureMessage, "Depart at")
}

func TestParseOptionalDayTimeInvalidDayOrTime(t *testing.T) {
	_, _, err := parseOptionalDayTime("funday", "")
	assert.Error(t, err)
	assert.Equal(t, "invalid day", err.Error())

	_, _, err = parseOptionalDayTime("", "25:00")
	assert.Error(t, err)
	assert.Equal(t, "invalid time", err.Error())
}

func TestDirectionsServiceGetShuttleDirectionsManualInvalidInput(t *testing.T) {
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

func TestPickNextDepartureCoversBranches(t *testing.T) {
	now := time.Date(2026, 2, 18, 0, 20, 0, 0, time.UTC) // 00:20

	departures := []string{"00:24", "00:54", "01:24"} // your schedule

	next := pickNextDepartureAt(now, departures)

	assert.Equal(t, "00:24", next)
}

func TestParseGoogleDurationCoversVariants(t *testing.T) {
	tests := []struct {
		input string
		want  time.Duration
	}{
		{duration, 2 * time.Minute},
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

func TestParseOptionalDayTimeValidInputs(t *testing.T) {
	ref, day, err := parseOptionalDayTime("monday", "10:15")
	assert.NoError(t, err)
	assert.Equal(t, "monday", day)
	assert.Equal(t, 10, ref.Hour())
	assert.Equal(t, 15, ref.Minute())
}

func TestWeekdayFromString(t *testing.T) {
	wd, ok := weekdayFromString("monday")
	assert.True(t, ok)
	assert.Equal(t, time.Monday, wd)

	_, ok = weekdayFromString("noday")
	assert.False(t, ok)
}

func TestNextOccurrence(t *testing.T) {
	now := time.Date(2026, 2, 18, 0, 0, 0, 0, time.UTC) // Wednesday
	next := nextOccurrence(now, time.Friday)
	assert.Equal(t, time.Friday, next.Weekday())
}

func TestFormatKm(t *testing.T) {
	assert.Equal(t, "500 m", formatKm(0.5))
	assert.Equal(t, "1.2 km", formatKm(1.23))
}

func TestHaversineKm(t *testing.T) {
	a := domain.LatLng{Lat: 45.0, Lng: -73.0}
	b := domain.LatLng{Lat: 45.1, Lng: -73.1}
	dist := haversineKm(a, b)
	assert.Greater(t, dist, 0.0)
}

func TestPickNextDepartureNoMatch(t *testing.T) {
	now := time.Date(2026, 2, 18, 23, 59, 0, 0, time.UTC)
	departures := []string{"00:10", "00:20"}

	next := pickNextDepartureAt(now, departures)
	assert.Equal(t, "", next)
}

func TestNonShuttleInvalidTimeInput(t *testing.T) {
	f := &fakeDirectionsClient{resp: domain.DirectionsResponse{Mode: "walking"}}
	s := NewDirectionsService(f)

	_, err := s.GetDirectionsWithSchedule(domain.LatLng{}, domain.LatLng{}, "walking", "", "25:99")
	assert.Error(t, err)
	assert.Equal(t, "invalid time", err.Error())
}

func TestManualShuttleNoRepo(t *testing.T) {
	f := &fakeDirectionsClient{}
	s := NewDirectionsService(f)

	_, err := s.GetShuttleDirectionsManual(domain.LatLng{}, domain.LatLng{}, "monday", "10:00")
	assert.Error(t, err)
	assert.Equal(t, "no shuttle available", err.Error())
}

type sequenceDirectionsClient struct {
	resps []domain.DirectionsResponse
	errs  []error
	i     int
}

func (f *sequenceDirectionsClient) GetDirections(start, end domain.LatLng, mode string) (domain.DirectionsResponse, error) {
	idx := f.i
	f.i++

	var resp domain.DirectionsResponse
	var err error

	if idx < len(f.resps) {
		resp = f.resps[idx]
	}
	if idx < len(f.errs) {
		err = f.errs[idx]
	}
	return resp, err
}
func TestGetShuttleDirectionsManualSuccessCoversReturnBlock(t *testing.T) {
	walkResp := domain.DirectionsResponse{
		Mode: "walking",
		Steps: []domain.DirectionStep{
			{Instruction: "Walk", Distance: "0.3 km", Duration: "7 mins"},
		},
		Polyline: []domain.LatLng{
			{Lat: 45.50, Lng: -73.58},
			{Lat: 45.49, Lng: -73.57},
		},
	}

	f := &sequenceDirectionsClient{
		resps: []domain.DirectionsResponse{walkResp, walkResp}, // to-stop, from-stop
	}
	repo := &fakeShuttleRepo{times: []string{"10:00", "11:00"}}
	s := NewDirectionsService(f).WithShuttleRepo(repo)

	resp, err := s.GetShuttleDirectionsManual(
		domain.LatLng{Lat: 45.497, Lng: -73.579},
		domain.LatLng{Lat: 45.459, Lng: -73.640},
		"monday",
		"10:00",
	)

	assert.NoError(t, err)
	assert.Equal(t, "shuttle", resp.Mode)
	assert.Contains(t, resp.DepartureMessage, "to catch the 10:00 shuttle")
	assert.GreaterOrEqual(t, len(resp.Steps), 3)
	assert.Contains(t, resp.Steps[1].Instruction, "departure: 10:00")
	assert.NotEmpty(t, resp.Polyline)
}

func TestGetShuttleDirectionsManualWalkToStopError(t *testing.T) {
	f := &sequenceDirectionsClient{
		errs: []error{errors.New("walk fail")},
	}
	repo := &fakeShuttleRepo{times: []string{"10:00"}}
	s := NewDirectionsService(f).WithShuttleRepo(repo)

	_, err := s.GetShuttleDirectionsManual(domain.LatLng{}, domain.LatLng{}, "monday", "10:00")
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "walking to shuttle stop")
}

func TestGetShuttleDirectionsManualWalkFromStopError(t *testing.T) {
	walkResp := domain.DirectionsResponse{
		Mode:  "walking",
		Steps: []domain.DirectionStep{{Duration: "2 mins"}},
	}
	f := &sequenceDirectionsClient{
		resps: []domain.DirectionsResponse{walkResp},
		errs:  []error{nil, errors.New("walk fail 2")},
	}
	repo := &fakeShuttleRepo{times: []string{"10:00"}}
	s := NewDirectionsService(f).WithShuttleRepo(repo)

	_, err := s.GetShuttleDirectionsManual(domain.LatLng{}, domain.LatLng{}, "monday", "10:00")
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "walking from shuttle stop")
}
