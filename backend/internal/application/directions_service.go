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

	// For departure message style
	userProvidedTime := strings.TrimSpace(at) != ""

	// Shuttle is composed (walk -> shuttle -> walk)
	if m == "shuttle" {
		ref, d, err := parseOptionalDayTime(day, at)
		if err != nil {
			return domain.DirectionsResponse{}, err
		}
		return s.getShuttleDirectionsAt(start, end, ref, d, userProvidedTime)
	}

	// Non-shuttle: normal Google route
	resp, err := s.fetcher.GetDirections(start, end, m)
	if err != nil {
		return domain.DirectionsResponse{}, err
	}

	// Departure message for non-shuttle:
	// - if time provided: "Depart at HH:MM"
	// - else: "Leave now at HH:MM"
	if userProvidedTime {
		// validate time input already happens in parseOptionalDayTime only for shuttle,
		// so for non-shuttle we parse just to avoid weird inputs.
		parsed, err := time.Parse("15:04", strings.TrimSpace(at))
		if err != nil {
			return domain.DirectionsResponse{}, errors.New("invalid time")
		}
		now := time.Now()
		ref := time.Date(now.Year(), now.Month(), now.Day(), parsed.Hour(), parsed.Minute(), 0, 0, now.Location())
		resp.DepartureMessage = "Depart at " + ref.Format("15:04")
	} else {
		resp.DepartureMessage = "Leave now at " + time.Now().Format("15:04")
	}

	return resp, nil
}

// ---- Shuttle composition logic ----

// Default shuttle stop coordinates (still fine; buildings endpoint provides real start/end anyway)
var sgwShuttleStop = domain.LatLng{Lat: 45.495376, Lng: -73.577997}
var loyShuttleStop = domain.LatLng{Lat: 45.459026, Lng: -73.638606}

func (s *DirectionsService) getShuttleDirectionsAt(start, end domain.LatLng, ref time.Time, day string, userProvidedTime bool) (domain.DirectionsResponse, error) {
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

	// You can only catch a shuttle AFTER you arrive at the stop
	walkDur := totalDurationFromSteps(walkToStop.Steps)
	arrivalAtStop := ref.Add(walkDur)

	// Shuttle middle leg (based on arrivalAtStop)
	shuttleStep, nextDeparture, err := s.buildShuttleStepAt(arrivalAtStop, day)

	if err != nil {
		// build shuttle step WITHOUT schedule
		shuttleStep = domain.DirectionStep{
			Instruction: "Take the Concordia Shuttle Bus from SGW to LOY",
			Distance:    formatKm(haversineKm(sgwShuttleStop, loyShuttleStop)),
			Duration:    "25 mins",
			Start:       sgwShuttleStop,
			End:         loyShuttleStop,
		}
		nextDeparture = ""
	}

	// Steps = walking + shuttle + walking
	steps := make([]domain.DirectionStep, 0, len(walkToStop.Steps)+1+len(walkFromStop.Steps))
	steps = append(steps, walkToStop.Steps...)
	steps = append(steps, shuttleStep)
	steps = append(steps, walkFromStop.Steps...)

	// Departure message:
	// leaveAt = (nextDepartureTime - walkDur)
	leaveAtStr := ""
	if nextDeparture != "" {
		parsed, err := time.Parse("15:04", nextDeparture)
		if err == nil {
			nextDepTime := time.Date(ref.Year(), ref.Month(), ref.Day(), parsed.Hour(), parsed.Minute(), 0, 0, ref.Location())
			leaveAtStr = nextDepTime.Add(-walkDur).Format("15:04")
		}
	}

	msgPrefix := "Leave now at "
	if userProvidedTime {
		msgPrefix = "Depart at "
	}

	depMsg := ""
	if leaveAtStr != "" {
		depMsg = fmt.Sprintf("%s%s to catch the %s shuttle", msgPrefix, leaveAtStr, nextDeparture)
	} else {
		// fallback (shouldn't happen normally if nextDeparture parsed ok)
		depMsg = msgPrefix + time.Now().Format("15:04")
	}

	return domain.DirectionsResponse{
		Mode:             "shuttle",
		DepartureMessage: depMsg,
		Polyline:         "",
		Steps:            steps,
	}, nil
}

func (s *DirectionsService) buildShuttleStepAt(ref time.Time, day string) (domain.DirectionStep, string, error) {
	distKm := haversineKm(sgwShuttleStop, loyShuttleStop)
	distStr := formatKm(distKm)

	durationStr := "25 mins"

	if s.shuttleRepo == nil {
		return domain.DirectionStep{}, "", errors.New("no shuttle available")
	}

	times, err := s.shuttleRepo.GetDepartures(day, "SGW")
	if err != nil || len(times) == 0 {
		return domain.DirectionStep{}, "", errors.New("no shuttle available")
	}

	next := pickNextDepartureAt(ref, times)
	if next == "" {
		return domain.DirectionStep{}, "", errors.New("no shuttle available")
	}

	step := domain.DirectionStep{
		Instruction: fmt.Sprintf("Take the Concordia Shuttle Bus from SGW to LOY (day: %s, next departure: %s)", day, next),
		Distance:    distStr,
		Duration:    durationStr,
		Start:       sgwShuttleStop,
		End:         loyShuttleStop,
	}
	return step, next, nil
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

// Manual shuttle departure selection
func (s *DirectionsService) GetShuttleDirectionsManual(start, end domain.LatLng, day, departure string) (domain.DirectionsResponse, error) {
	d := strings.ToLower(strings.TrimSpace(day))
	if !isValidDay(d) {
		return domain.DirectionsResponse{}, errors.New("invalid shuttle_day")
	}

	departure = strings.TrimSpace(departure)
	depParsed, err := time.Parse("15:04", departure)
	if err != nil {
		return domain.DirectionsResponse{}, errors.New("invalid shuttle_time")
	}

	if s.shuttleRepo == nil {
		return domain.DirectionsResponse{}, errors.New("no shuttle available")
	}

	times, err := s.shuttleRepo.GetDepartures(d, "SGW")
	if err != nil || len(times) == 0 {
		return domain.DirectionsResponse{}, errors.New("no shuttle available")
	}

	// validate the departure exists exactly in schedule
	ok := false
	for _, t := range times {
		if strings.TrimSpace(t) == departure {
			ok = true
			break
		}
	}
	if !ok {
		return domain.DirectionsResponse{}, errors.New("invalid shuttle departure")
	}

	// Walk to stop
	walkToStop, err := s.fetcher.GetDirections(start, sgwShuttleStop, "walking")
	if err != nil {
		return domain.DirectionsResponse{}, fmt.Errorf("walking to shuttle stop: %w", err)
	}

	// Walk from stop to destination
	walkFromStop, err := s.fetcher.GetDirections(loyShuttleStop, end, "walking")
	if err != nil {
		return domain.DirectionsResponse{}, fmt.Errorf("walking from shuttle stop: %w", err)
	}

	// Departure message: compute "leave at" based on walking time to stop
	walkDur := totalDurationFromSteps(walkToStop.Steps)

	now := time.Now()
	targetWd, ok := weekdayFromString(d)
	if !ok {
		return domain.DirectionsResponse{}, errors.New("invalid shuttle_day")
	}
	depDate := nextOccurrence(now, targetWd)
	depDateTime := time.Date(depDate.Year(), depDate.Month(), depDate.Day(), depParsed.Hour(), depParsed.Minute(), 0, 0, depDate.Location())

	leaveAt := depDateTime.Add(-walkDur).Format("15:04")
	depMsg := fmt.Sprintf("Depart at %s to catch the %s shuttle", leaveAt, departure)

	// Shuttle step
	shuttleStep := domain.DirectionStep{
		Instruction: fmt.Sprintf("Take the Concordia Shuttle Bus from SGW to LOY (day: %s, departure: %s)", d, depParsed.Format("15:04")),
		Distance:    formatKm(haversineKm(sgwShuttleStop, loyShuttleStop)),
		Duration:    "25 mins",
		Start:       sgwShuttleStop,
		End:         loyShuttleStop,
	}

	steps := make([]domain.DirectionStep, 0, len(walkToStop.Steps)+1+len(walkFromStop.Steps))
	steps = append(steps, walkToStop.Steps...)
	steps = append(steps, shuttleStep)
	steps = append(steps, walkFromStop.Steps...)

	return domain.DirectionsResponse{
		Mode:             "shuttle",
		DepartureMessage: depMsg,
		Polyline:         "",
		Steps:            steps,
	}, nil
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

func weekdayFromString(s string) (time.Weekday, bool) {
	switch strings.ToLower(strings.TrimSpace(s)) {
	case "sunday":
		return time.Sunday, true
	case "monday":
		return time.Monday, true
	case "tuesday":
		return time.Tuesday, true
	case "wednesday":
		return time.Wednesday, true
	case "thursday":
		return time.Thursday, true
	case "friday":
		return time.Friday, true
	case "saturday":
		return time.Saturday, true
	default:
		return time.Sunday, false
	}
}

// Returns the next occurrence of target weekday (including today if it matches)
func nextOccurrence(from time.Time, target time.Weekday) time.Time {
	cur := from.Weekday()
	delta := (int(target) - int(cur) + 7) % 7
	return from.AddDate(0, 0, delta)
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
	now := time.Now().Truncate(time.Minute)
	return pickNextDepartureAt(now, times)
}
