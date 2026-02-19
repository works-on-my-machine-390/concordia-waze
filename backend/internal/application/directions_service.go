package application

import (
	"errors"
	"fmt"
	"math"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/works-on-my-machine-390/concordia-waze/internal/domain"
)

type DirectionsFetcher interface {
	GetDirections(start, end domain.LatLng, mode string) (domain.DirectionsResponse, error)
}

type ShuttleScheduleProvider interface {
	// day: "monday", "tuesday", ...
	// campus: "SGW" or "LOY"
	GetDepartures(day, campus string) ([]string, error)
}

type DirectionsService struct {
	fetcher     DirectionsFetcher
	shuttleRepo ShuttleScheduleProvider // optional
}

func NewDirectionsService(fetcher DirectionsFetcher) *DirectionsService {
	return &DirectionsService{
		fetcher: fetcher,
	}
}

// Optional: inject schedule repo if available
func (s *DirectionsService) WithShuttleRepo(repo ShuttleScheduleProvider) *DirectionsService {
	s.shuttleRepo = repo
	return s
}

// Backwards-compatible entrypoint (existing callers/tests keep working)
func (s *DirectionsService) GetDirections(start, end domain.LatLng, mode string) (domain.DirectionsResponse, error) {
	return s.GetDirectionsWithSchedule(start, end, mode, "", "")
}

// NEW: optional day/time for shuttle mode
// day: "monday"..."sunday" (optional)
// at: "HH:MM" 24h (optional)
func (s *DirectionsService) GetDirectionsWithSchedule(start, end domain.LatLng, mode, day, at string) (domain.DirectionsResponse, error) {
	m := strings.ToLower(strings.TrimSpace(mode))
	if m == "" {
		m = "walking"
	}

	allowed := map[string]bool{
		"walking": true,
		"driving": true,
		"transit": true,
		"shuttle": true,
	}
	if !allowed[m] {
		return domain.DirectionsResponse{}, errors.New("invalid mode")
	}

	// Shuttle is composed (walk -> shuttle -> walk)
	if m == "shuttle" {
		ref, d, err := parseOptionalDayTime(day, at)
		if err != nil {
			// "invalid day" or "invalid time"
			return domain.DirectionsResponse{}, err
		}
		return s.getShuttleDirectionsAt(start, end, ref, d)
	}

	return s.fetcher.GetDirections(start, end, m)
}

// ---- Shuttle composition logic ----

// Default shuttle stop coordinates (still fine; your handler/buildings endpoint provides the real start/end anyway)
var sgwShuttleStop = domain.LatLng{Lat: 45.495376, Lng: -73.577997}
var loyShuttleStop = domain.LatLng{Lat: 45.459026, Lng: -73.638606}

func (s *DirectionsService) getShuttleDirectionsAt(start, end domain.LatLng, ref time.Time, day string) (domain.DirectionsResponse, error) {
	// Walk from start -> SGW stop
	walkToStop, err := s.fetcher.GetDirections(start, sgwShuttleStop, "walking")
	if err != nil {
		return domain.DirectionsResponse{}, fmt.Errorf("walking to shuttle stop: %w", err)
	}

	// Walk from LOY stop -> end
	walkFromStop, err := s.fetcher.GetDirections(loyShuttleStop, end, "walking")
	if err != nil {
		return domain.DirectionsResponse{}, fmt.Errorf("walking from shuttle stop: %w", err)
	}

	// ✅ IMPORTANT: you can only catch a shuttle AFTER you arrive at the stop
	arrivalAtStop := ref.Add(totalDurationFromSteps(walkToStop.Steps))

	// Shuttle “middle leg” (now uses arrivalAtStop)
	shuttleStep, err := s.buildShuttleStepAt(arrivalAtStop, day)
	if err != nil {
		return domain.DirectionsResponse{}, err
	}

	steps := make([]domain.DirectionStep, 0, len(walkToStop.Steps)+1+len(walkFromStop.Steps))
	steps = append(steps, walkToStop.Steps...)
	steps = append(steps, shuttleStep)

	// ✅ If no shuttle is available, stop there (don’t pretend you can reach LOY)
	if strings.Contains(strings.ToLower(shuttleStep.Instruction), "no shuttle available") {
		poly := make([]domain.LatLng, 0, len(walkToStop.Polyline))
		poly = append(poly, walkToStop.Polyline...)
		return domain.DirectionsResponse{
			Mode:     "shuttle",
			Polyline: poly,
			Steps:    steps,
		}, nil
	}

	steps = append(steps, walkFromStop.Steps...)

	poly := make([]domain.LatLng, 0, len(walkToStop.Polyline)+2+len(walkFromStop.Polyline))
	poly = append(poly, walkToStop.Polyline...)
	poly = append(poly, sgwShuttleStop, loyShuttleStop)
	poly = append(poly, walkFromStop.Polyline...)

	return domain.DirectionsResponse{
		Mode:     "shuttle",
		Polyline: poly,
		Steps:    steps,
	}, nil
}

func (s *DirectionsService) buildShuttleStepAt(ref time.Time, day string) (domain.DirectionStep, error) {
	distKm := haversineKm(sgwShuttleStop, loyShuttleStop)
	distStr := formatKm(distKm)

	durationStr := "25 mins"

	if s.shuttleRepo != nil {
		times, err := s.shuttleRepo.GetDepartures(day, "SGW")
		if err != nil || len(times) == 0 {
			return domain.DirectionStep{}, errors.New("no shuttle available")
		}

		next := pickNextDepartureAt(ref, times)
		if next == "" {
			return domain.DirectionStep{}, errors.New("no shuttle available")
		}

		return domain.DirectionStep{
			Instruction: fmt.Sprintf("Take the Concordia Shuttle Bus from SGW to LOY (day: %s, next departure: %s)", day, next),
			Distance:    distStr,
			Duration:    durationStr,
			Start:       sgwShuttleStop,
			End:         loyShuttleStop,
		}, nil
	}

	return domain.DirectionStep{}, errors.New("no shuttle available")
}

// ---- Optional day/time parsing ----

func parseOptionalDayTime(day, at string) (time.Time, string, error) {
	now := time.Now()

	dayLower := strings.ToLower(strings.TrimSpace(day))
	if dayLower == "" {
		dayLower = strings.ToLower(now.Weekday().String())
	} else if !isValidDay(dayLower) {
		return time.Time{}, "", errors.New("invalid day")
	}

	ref := now
	at = strings.TrimSpace(at)
	if at != "" {
		parsed, err := time.Parse("15:04", at)
		if err != nil {
			return time.Time{}, "", errors.New("invalid time")
		}
		ref = time.Date(now.Year(), now.Month(), now.Day(), parsed.Hour(), parsed.Minute(), 0, 0, now.Location())
	}

	return ref, dayLower, nil
}

func isValidDay(d string) bool {
	switch d {
	case "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday":
		return true
	default:
		return false
	}
}

// ---- Helpers ----

func haversineKm(a, b domain.LatLng) float64 {
	const R = 6371.0
	lat1 := deg2rad(a.Lat)
	lat2 := deg2rad(b.Lat)
	dLat := deg2rad(b.Lat - a.Lat)
	dLng := deg2rad(b.Lng - a.Lng)

	sinDLat := math.Sin(dLat / 2)
	sinDLng := math.Sin(dLng / 2)

	h := sinDLat*sinDLat + math.Cos(lat1)*math.Cos(lat2)*sinDLng*sinDLng
	c := 2 * math.Atan2(math.Sqrt(h), math.Sqrt(1-h))
	return R * c
}

func deg2rad(d float64) float64 { return d * math.Pi / 180 }

func formatKm(km float64) string {
	if km < 1 {
		m := int(math.Round(km * 1000))
		return fmt.Sprintf("%d m", m)
	}
	return fmt.Sprintf("%.1f km", km)
}

func totalDurationFromSteps(steps []domain.DirectionStep) time.Duration {
	total := time.Duration(0)
	for _, st := range steps {
		total += parseGoogleDuration(st.Duration)
	}
	return total
}

// Handles strings like:
// "2 mins", "1 min", "1 hour", "1 hour 5 mins", "2 hours 1 min"
func parseGoogleDuration(s string) time.Duration {
	s = strings.ToLower(strings.TrimSpace(s))
	if s == "" {
		return 0
	}

	parts := strings.Fields(s) // e.g. ["1","hour","5","mins"]
	var hours, mins int

	for i := 0; i < len(parts)-1; i++ {
		n, err := strconv.Atoi(parts[i])
		if err != nil {
			continue
		}

		unit := parts[i+1]
		if strings.HasPrefix(unit, "hour") {
			hours += n
		} else if strings.HasPrefix(unit, "min") {
			mins += n
		}
	}

	return time.Duration(hours)*time.Hour + time.Duration(mins)*time.Minute
}

// NEW implementation used by shuttle step logic
func pickNextDepartureAt(ref time.Time, times []string) string {
	sort.Slice(times, func(i, j int) bool {
		return strings.TrimSpace(times[i]) < strings.TrimSpace(times[j])
	})

	for _, t := range times {
		tt := strings.TrimSpace(t)
		parsed, err := time.Parse("15:04", tt)
		if err != nil {
			continue
		}
		cand := time.Date(ref.Year(), ref.Month(), ref.Day(), parsed.Hour(), parsed.Minute(), 0, 0, ref.Location())
		if !cand.Before(ref) {
			return tt
		}
	}
	return ""
}

// BACKWARD COMPAT: keep old name so your existing test compiles unchanged
func pickNextDeparture(times []string) string {
	return pickNextDepartureAt(time.Now(), times)
}
