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

func TestDirectionsService_PropagatesClientError(t *testing.T) {
	f := &fakeDirectionsClient{err: errors.New("boom")}
	s := NewDirectionsService(f)

	_, err := s.GetDirections(domain.LatLng{}, domain.LatLng{}, []string{"walking"})
	assert.Error(t, err)
	assert.Equal(t, "boom", err.Error())
}

func TestDirectionsService_ShuttleMode_ComposesWalkingLegsAndShuttleStep(t *testing.T) {
	f := &fakeDirectionsClient{
		resp: domain.DirectionsResponse{
			Mode:     "walking",
			Polyline: "encoded-polyline",
			Steps: []domain.DirectionStep{
				{
					Instruction: "Walk segment",
					Distance:    "0.2 km",
					Duration:    "2 mins",
					Start:       domain.LatLng{Lat: 45.495, Lng: -73.578},
					End:         domain.LatLng{Lat: 45.497, Lng: -73.579},
				},
			},
		},
	}

	shuttleRepo := &fakeShuttleRepo{
		times: []string{"00:01", "23:59"},
	}

	s := NewDirectionsService(f).WithShuttleRepo(shuttleRepo)

	start := domain.LatLng{Lat: 45.4973, Lng: -73.5790}
	end := domain.LatLng{Lat: 45.4582, Lng: -73.6405}

	resp, err := s.GetDirections(start, end, []string{"shuttle"})
	assert.NoError(t, err)
	assert.Len(t, resp, 1)

	r := resp[0]
	assert.Equal(t, "shuttle", r.Mode)
	assert.GreaterOrEqual(t, len(r.Steps), 3)

	foundShuttle := false
	for _, st := range r.Steps {
		if contains(st.Instruction, "Shuttle") || contains(st.Instruction, "shuttle") {
			foundShuttle = true
			break
		}
	}
	assert.True(t, foundShuttle)
	assert.Equal(t, 2, f.calls)
}

func TestDirectionsService_ShuttleMode_ReturnsErrorWhenRepoMissingOrErrors(t *testing.T) {
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

	_, err := s.GetDirections(domain.LatLng{Lat: 1, Lng: 2}, domain.LatLng{Lat: 3, Lng: 4}, []string{"shuttle"})
	assert.Error(t, err)
	assert.Equal(t, "No shuttle available at this time.", err.Error())
}

func TestDirectionsService_ShuttleMode_OutsideHours(t *testing.T) {
	f := &fakeDirectionsClient{
		resp: domain.DirectionsResponse{
			Mode: "walking",
			Steps: []domain.DirectionStep{
				{Instruction: "Walk segment", Distance: "0.2 km", Duration: "2 mins"},
			},
		},
	}

	shuttleRepo := &fakeShuttleRepo{
		times: []string{"09:00", "10:00"},
	}
	s := NewDirectionsService(f).WithShuttleRepo(shuttleRepo)

	_, err := s.GetDirectionsWithSchedule(domain.LatLng{}, domain.LatLng{}, []string{"shuttle"}, "monday", "20:00")
	assert.Error(t, err)
	assert.Equal(t, "No shuttle available at this time.", err.Error())
}

func TestDirectionsService_ShuttleMode_InsideHours(t *testing.T) {
	f := &fakeDirectionsClient{
		resp: domain.DirectionsResponse{
			Mode: "walking",
			Steps: []domain.DirectionStep{
				{Instruction: "Walk segment", Distance: "0.2 km", Duration: "2 mins"},
			},
		},
	}

	shuttleRepo := &fakeShuttleRepo{
		times: []string{"09:00", "20:00"},
	}
	s := NewDirectionsService(f).WithShuttleRepo(shuttleRepo)

	resp, err := s.GetDirectionsWithSchedule(domain.LatLng{}, domain.LatLng{}, []string{"shuttle"}, "monday", "10:00")
	assert.NoError(t, err)
	assert.Equal(t, "shuttle", resp[0].Mode)
}

func TestDirectionsService_GetDirectionsWithSchedule_NonShuttleWithUserTime(t *testing.T) {
	f := &fakeDirectionsClient{resp: domain.DirectionsResponse{Mode: "walking"}}
	s := NewDirectionsService(f)

	resp, err := s.GetDirectionsWithSchedule(domain.LatLng{}, domain.LatLng{}, []string{"walking"}, "", "14:30")
	assert.NoError(t, err)
	assert.Contains(t, resp[0].DepartureMessage, "Depart at")
}

func TestParseOptionalDayTime_InvalidDayOrTime(t *testing.T) {
	_, _, err := parseOptionalDayTime("funday", "")
	assert.Error(t, err)
	assert.Equal(t, "invalid day", err.Error())

	_, _, err = parseOptionalDayTime("", "25:00")
	assert.Error(t, err)
	assert.Equal(t, "invalid time", err.Error())
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

func TestParseOptionalDayTime_ValidInputs(t *testing.T) {
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

func TestPickNextDeparture_NoMatch(t *testing.T) {
	now := time.Date(2026, 2, 18, 23, 59, 0, 0, time.UTC)
	departures := []string{"00:10", "00:20"}

	next := pickNextDepartureAt(now, departures)
	assert.Equal(t, "", next)
}

func TestNonShuttle_InvalidTimeInput(t *testing.T) {
	f := &fakeDirectionsClient{resp: domain.DirectionsResponse{Mode: "walking"}}
	s := NewDirectionsService(f)

	_, err := s.GetDirectionsWithSchedule(domain.LatLng{}, domain.LatLng{}, []string{"walking"}, "", "25:99")
	assert.Error(t, err)
	assert.Equal(t, "invalid time", err.Error())
}

func TestFormatDuration(t *testing.T) {
	tests := []struct {
		d    time.Duration
		want string
	}{
		{0, "0 mins"},
		{30 * time.Second, "1 min"},
		{29 * time.Second, "0 mins"},
		{1 * time.Minute, "1 min"},
		{2 * time.Minute, "2 mins"},
		{1 * time.Hour, "1 hour"},
		{2 * time.Hour, "2 hours"},
		{1*time.Hour + 1*time.Minute, "1 hour 1 min"},
		{1*time.Hour + 2*time.Minute, "1 hour 2 mins"},
		{2*time.Hour + 1*time.Minute, "2 hours 1 min"},
		{-5 * time.Minute, "5 mins"},
	}
	for _, tt := range tests {
		assert.Equal(t, tt.want, formatDuration(tt.d))
	}
}

func TestParseDistance(t *testing.T) {
	tests := []struct {
		in   string
		want float64
	}{
		{"1 km", 1.0},
		{"500 m", 0.5},
		{"1.5 km", 1.5},
		{"1000 m", 1.0},
		{"invalid", 0},
		{"100", 0},
		{"abc km", 0},
	}
	for _, tt := range tests {
		assert.InDelta(t, tt.want, parseDistance(tt.in), 0.001)
	}
}

func TestStripDegenerateSteps(t *testing.T) {
	steps := []domain.DirectionStep{
		{Start: domain.LatLng{Lat: 0, Lng: 0}, End: domain.LatLng{Lat: 0, Lng: 0}, Instruction: "Skip me"},
		{Start: domain.LatLng{Lat: 0, Lng: 0}, End: domain.LatLng{Lat: 1, Lng: 1}, Instruction: "Keep me"},
	}
	got := stripDegenerateSteps(steps)
	assert.Len(t, got, 1)
	assert.Equal(t, "Keep me", got[0].Instruction)
}

func TestPolylineEncodingDecoding(t *testing.T) {
	points := []domain.LatLng{
		{Lat: 38.5, Lng: -120.2},
		{Lat: 40.7, Lng: -120.95},
		{Lat: 43.252, Lng: -126.453},
	}
	encoded := encodePolyline(points)
	decoded, err := decodePolyline(encoded)
	assert.NoError(t, err)
	assert.Len(t, decoded, 3)
	assert.InDelta(t, points[0].Lat, decoded[0].Lat, 0.00001)
	assert.InDelta(t, points[0].Lng, decoded[0].Lng, 0.00001)
}

func TestDecodePolyline_Invalid(t *testing.T) {
	_, err := decodePolyline("invalid-string")
	assert.Error(t, err)
}

func TestBuildCombinedShuttlePolyline(t *testing.T) {
	p1 := encodePolyline([]domain.LatLng{{Lat: 0, Lng: 0}, {Lat: 1, Lng: 1}})
	p2 := encodePolyline([]domain.LatLng{{Lat: 1, Lng: 1}, {Lat: 2, Lng: 2}})
	p3 := encodePolyline([]domain.LatLng{{Lat: 2, Lng: 2}, {Lat: 3, Lng: 3}})

	combined := buildCombinedShuttlePolyline(p1, p2, p3)
	decoded, _ := decodePolyline(combined)
	assert.Len(t, decoded, 6)
}

func TestShuttleDirection_Selection(t *testing.T) {
	startSGW := domain.LatLng{Lat: 45.497, Lng: -73.579}
	from, to, fc, tc := shuttleDirection(startSGW)
	assert.Equal(t, "SGW", fc)
	assert.Equal(t, "LOY", tc)
	assert.Equal(t, sgwShuttleStop, from)
	assert.Equal(t, loyShuttleStop, to)

	startLOY := domain.LatLng{Lat: 45.459, Lng: -73.639}
	from, to, fc, tc = shuttleDirection(startLOY)
	assert.Equal(t, "LOY", fc)
	assert.Equal(t, "SGW", tc)
	assert.Equal(t, loyShuttleStop, from)
	assert.Equal(t, sgwShuttleStop, to)
}
