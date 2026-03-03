package application

import (
	"errors"
	"fmt"
	"math"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/works-on-my-machine-390/concordia-waze/internal/constants"
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

const (
	shuttleDuration  = "25 mins"
	noShuttleErrText = "No shuttle available at this time."
)

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
		"walking":   true,
		"driving":   true,
		"transit":   true,
		"shuttle":   true,
		"bicycling": true,
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

	// Departure message for non-shuttle: always "Leave now"
	resp.DepartureMessage = "Leave now"

	return resp, nil
}

// ---- Shuttle composition logic ----

// Default shuttle stop coordinates (still fine; buildings endpoint provides real start/end anyway)
var sgwShuttleStop = constants.SGWShuttleStopPosition
var loyShuttleStop = constants.LOYShuttleStopPosition

// shuttleDirection determines which stop to depart from based on proximity of start to each stop.
// Returns (fromStop, toStop, fromCampus, toCampus).
func shuttleDirection(start domain.LatLng) (fromStop, toStop domain.LatLng, fromCampus, toCampus string) {
	if haversineKm(start, sgwShuttleStop) <= haversineKm(start, loyShuttleStop) {
		return sgwShuttleStop, loyShuttleStop, "SGW", "LOY"
	}
	return loyShuttleStop, sgwShuttleStop, "LOY", "SGW"
}

func (s *DirectionsService) getShuttleDirectionsAt(start, end domain.LatLng, ref time.Time, day string, userProvidedTime bool) (domain.DirectionsResponse, error) {
	// Determine which direction the shuttle should run based on start location.
	fromStop, toStop, fromCampus, toCampus := shuttleDirection(start)

	walkToStop, walkFromStop, walkDur, err := s.fetchShuttleWalkLegs(start, end, fromStop, toStop)
	if err != nil {
		return domain.DirectionsResponse{}, err
	}

	// You can only catch a shuttle AFTER you arrive at the stop.
	arrivalAtStop := ref.Add(walkDur)

	// Shuttle middle leg (based on arrivalAtStop)
	shuttleStep, nextDeparture, err := s.buildShuttleStepAt(arrivalAtStop, day, fromCampus, toCampus, fromStop, toStop)
	if err != nil {
		return domain.DirectionsResponse{}, err
	}
	applyShuttlePolyline(&shuttleStep, fromCampus, toCampus)

	// Departure message:
	// leaveAt = (nextDepartureTime - walkDur)
	leaveAtStr := ""
	var leaveAtTime time.Time

	if nextDeparture != "" {
		parsed, err := time.Parse("15:04", nextDeparture)
		if err == nil {
			nextDepTime := time.Date(ref.Year(), ref.Month(), ref.Day(), parsed.Hour(), parsed.Minute(), 0, 0, ref.Location())
			leaveAtTime = nextDepTime.Add(-walkDur)
			leaveAtStr = leaveAtTime.Format("15:04")
		}
	}

	depMsg := ""
	if leaveAtStr != "" {
		if userProvidedTime {
			if !ref.Before(leaveAtTime.Add(-time.Minute)) {
				depMsg = fmt.Sprintf("Leave now to catch the %s shuttle", nextDeparture)
			} else {
				depMsg = fmt.Sprintf("Depart at %s to catch the %s shuttle", leaveAtStr, nextDeparture)
			}
		} else if leaveAtTime.After(time.Now().Add(time.Minute)) {
			depMsg = fmt.Sprintf("Leave at %s to catch the %s shuttle", leaveAtStr, nextDeparture)
		} else {
			depMsg = fmt.Sprintf("Leave now to catch the %s shuttle", nextDeparture)
		}
	} else {
		// fallback (shouldn't happen normally if nextDeparture parsed ok)
		if userProvidedTime {
			depMsg = "Depart at " + time.Now().Format("15:04")
		} else {
			depMsg = "Leave now at " + time.Now().Format("15:04")
		}
	}

	return buildShuttleRouteResponse(depMsg, walkToStop, shuttleStep, walkFromStop), nil
}

func (s *DirectionsService) buildShuttleStepAt(ref time.Time, day, fromCampus, toCampus string, fromStop, toStop domain.LatLng) (domain.DirectionStep, string, error) {
	distKm := haversineKm(fromStop, toStop)
	distStr := formatKm(distKm)

	durationStr := shuttleDuration

	if s.shuttleRepo == nil {
		return domain.DirectionStep{}, "", errors.New(noShuttleErrText)
	}

	times, err := s.shuttleRepo.GetDepartures(day, fromCampus)
	if err != nil || len(times) == 0 {
		return domain.DirectionStep{}, "", errors.New(noShuttleErrText)
	}

	next := pickNextDepartureAt(ref, times)
	if next == "" {
		return domain.DirectionStep{}, "", errors.New(noShuttleErrText)
	}

	step := newBaseShuttleStep(fromCampus, toCampus, fromStop, toStop)
	step.Distance = distStr
	step.Duration = durationStr
	step.Instruction = fmt.Sprintf("Take the Concordia Shuttle Bus from %s to %s (day: %s, next departure: %s)", fromCampus, toCampus, day, next)
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
		return domain.DirectionsResponse{}, errors.New(noShuttleErrText)
	}

	// Determine direction based on start proximity to shuttle stops.
	fromStop, toStop, fromCampus, toCampus := shuttleDirection(start)

	times, err := s.shuttleRepo.GetDepartures(d, fromCampus)
	if err != nil || len(times) == 0 {
		return domain.DirectionsResponse{}, errors.New(noShuttleErrText)
	}

	// validate the departure exists exactly in schedule
	if !hasExactDeparture(times, departure) {
		return domain.DirectionsResponse{}, errors.New("invalid shuttle departure")
	}

	walkToStop, walkFromStop, walkDur, err := s.fetchShuttleWalkLegs(start, end, fromStop, toStop)
	if err != nil {
		return domain.DirectionsResponse{}, err
	}

	now := time.Now()
	targetWd, ok := weekdayFromString(d)
	if !ok {
		return domain.DirectionsResponse{}, errors.New("invalid shuttle_day")
	}
	depDate := nextOccurrence(now, targetWd)
	depDateTime := time.Date(depDate.Year(), depDate.Month(), depDate.Day(), depParsed.Hour(), depParsed.Minute(), 0, 0, depDate.Location())

	leaveAt := depDateTime.Add(-walkDur).Format("15:04")
	depMsg := fmt.Sprintf("Depart at %s to catch the %s shuttle", leaveAt, departure)

	shuttleStep := newBaseShuttleStep(fromCampus, toCampus, fromStop, toStop)
	shuttleStep.Instruction = fmt.Sprintf("Take the Concordia Shuttle Bus from %s to %s (day: %s, departure: %s)", fromCampus, toCampus, d, depParsed.Format("15:04"))
	applyShuttlePolyline(&shuttleStep, fromCampus, toCampus)

	return buildShuttleRouteResponse(depMsg, walkToStop, shuttleStep, walkFromStop), nil
}

func (s *DirectionsService) fetchShuttleWalkLegs(start, end, fromStop, toStop domain.LatLng) (domain.DirectionsResponse, domain.DirectionsResponse, time.Duration, error) {
	walkToStop, err := s.fetcher.GetDirections(start, fromStop, "walking")
	if err != nil {
		return domain.DirectionsResponse{}, domain.DirectionsResponse{}, 0, fmt.Errorf("walking to shuttle stop: %w", err)
	}

	walkFromStop, err := s.fetcher.GetDirections(toStop, end, "walking")
	if err != nil {
		return domain.DirectionsResponse{}, domain.DirectionsResponse{}, 0, fmt.Errorf("walking from shuttle stop: %w", err)
	}

	return walkToStop, walkFromStop, totalDurationFromSteps(walkToStop.Steps), nil
}

func newBaseShuttleStep(fromCampus, toCampus string, fromStop, toStop domain.LatLng) domain.DirectionStep {
	return domain.DirectionStep{
		Instruction: fmt.Sprintf("Take the Concordia Shuttle Bus from %s to %s", fromCampus, toCampus),
		Distance:    formatKm(haversineKm(fromStop, toStop)),
		Duration:    shuttleDuration,
		Start:       fromStop,
		End:         toStop,
		TravelMode:  "Shuttle",
	}
}

func applyShuttlePolyline(step *domain.DirectionStep, fromCampus, toCampus string) {
	if fromCampus == "LOY" && toCampus == "SGW" {
		step.Polyline = constants.ShuttlePolylineLOYtoSGW
		return
	}
	step.Polyline = constants.ShuttlePolylineSGWtoLOY
}

func buildShuttleRouteResponse(depMsg string, walkToStop domain.DirectionsResponse, shuttleStep domain.DirectionStep, walkFromStop domain.DirectionsResponse) domain.DirectionsResponse {
	steps := make([]domain.DirectionStep, 0, len(walkToStop.Steps)+1+len(walkFromStop.Steps))
	steps = append(steps, stripDegenerateSteps(walkToStop.Steps)...)
	steps = append(steps, shuttleStep)
	steps = append(steps, stripDegenerateSteps(walkFromStop.Steps)...)

	totalDuration := time.Duration(0)
	totalDistanceKm := 0.0
	for _, s := range steps {
		totalDuration += parseGoogleDuration(s.Duration)
		totalDistanceKm += parseDistance(s.Distance)
	}

	combinedPolyline := buildCombinedShuttlePolyline(walkToStop.Polyline, shuttleStep.Polyline, walkFromStop.Polyline)

	return domain.DirectionsResponse{
		Mode:             "shuttle",
		DepartureMessage: depMsg,
		Distance:         formatKm(totalDistanceKm),
		Duration:         formatDuration(totalDuration),
		Polyline:         combinedPolyline,
		Steps:            steps,
	}
}

func hasExactDeparture(times []string, departure string) bool {
	for _, t := range times {
		if strings.TrimSpace(t) == departure {
			return true
		}
	}
	return false
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

// formatDuration formats a time.Duration into a string like "1 hour 5 mins" or "3 mins".
func formatDuration(d time.Duration) string {
	if d < 0 {
		d = -d
	}
	totalMinutes := int(math.Round(d.Minutes()))

	if totalMinutes == 0 {
		return "0 mins"
	}

	hours := totalMinutes / 60
	minutes := totalMinutes % 60

	var parts []string
	if hours > 0 {
		part := fmt.Sprintf("%d hour", hours)
		if hours > 1 {
			part += "s"
		}
		parts = append(parts, part)
	}

	if minutes > 0 {
		part := fmt.Sprintf("%d min", minutes)
		if minutes > 1 {
			part += "s"
		}
		parts = append(parts, part)
	}

	if len(parts) == 0 {
		return "0 mins"
	}

	return strings.Join(parts, " ")
}

// parseDistance parses a distance string (e.g., "1.2 km", "500 m") and returns the distance in kilometers.
func parseDistance(s string) float64 {
	s = strings.ToLower(strings.TrimSpace(s))
	parts := strings.Fields(s)
	if len(parts) != 2 {
		return 0
	}

	val, err := strconv.ParseFloat(parts[0], 64)
	if err != nil {
		return 0
	}

	unit := parts[1]
	if unit == "m" {
		return val / 1000
	}
	// assume km
	return val
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

// stripDegenerateSteps removes steps where start == end (zero-distance walk that
// Google returns when the origin is already at the destination after road snapping).
// These steps carry no navigational value and clutter the response.
func stripDegenerateSteps(steps []domain.DirectionStep) []domain.DirectionStep {
	filtered := steps[:0:0] // same backing array, zero length
	for _, s := range steps {
		if s.Start.Lat == s.End.Lat && s.Start.Lng == s.End.Lng {
			continue
		}
		filtered = append(filtered, s)
	}
	return filtered
}

// ---- Shuttle polyline helpers ----

// buildCombinedShuttlePolyline merges three encoded polylines into one:
// the walking leg to the shuttle stop, the shuttle leg (walking directions between
// the stops, following the Sherbrooke corridor the shuttle actually uses), and the
// walking leg from the shuttle stop to the destination.
// If any segment fails to decode it is silently skipped; the result is never nil.
func buildCombinedShuttlePolyline(walkToEncoded, shuttleLegEncoded, walkFromEncoded string) string {
	toPoints, _ := decodePolyline(walkToEncoded)
	shuttlePoints, _ := decodePolyline(shuttleLegEncoded)
	fromPoints, _ := decodePolyline(walkFromEncoded)

	combined := make([]domain.LatLng, 0, len(toPoints)+len(shuttlePoints)+len(fromPoints))
	combined = append(combined, toPoints...)
	combined = append(combined, shuttlePoints...)
	combined = append(combined, fromPoints...)

	return encodePolyline(combined)
}

func decodePolyline(encoded string) ([]domain.LatLng, error) {
	var (
		points []domain.LatLng
		lat    int
		lng    int
		i      int
	)

	for i < len(encoded) {
		var err error
		var dlat int
		dlat, i, err = decodeSignedInt(encoded, i)
		if err != nil {
			return nil, err
		}
		lat += dlat

		var dlng int
		dlng, i, err = decodeSignedInt(encoded, i)
		if err != nil {
			return nil, err
		}
		lng += dlng

		points = append(points, domain.LatLng{
			Lat: float64(lat) / 1e5,
			Lng: float64(lng) / 1e5,
		})
	}

	return points, nil
}

func decodeSignedInt(encoded string, i int) (int, int, error) {
	var result int
	var shift uint

	for {
		if i >= len(encoded) {
			return 0, i, errors.New("invalid polyline encoding")
		}
		b := int(encoded[i]) - 63
		i++
		result |= (b & 0x1f) << shift
		shift += 5
		if b < 0x20 {
			break
		}
	}

	value := (result >> 1) ^ (-(result & 1))
	return value, i, nil
}

func encodePolyline(points []domain.LatLng) string {
	if len(points) == 0 {
		return ""
	}

	var out strings.Builder
	prevLat := 0
	prevLng := 0

	for _, p := range points {
		lat := int(math.Round(p.Lat * 1e5))
		lng := int(math.Round(p.Lng * 1e5))

		encodeSignedValue(&out, lat-prevLat)
		encodeSignedValue(&out, lng-prevLng)

		prevLat = lat
		prevLng = lng
	}

	return out.String()
}

func encodeSignedValue(out *strings.Builder, value int) {
	v := value << 1
	if value < 0 {
		v = ^v
	}

	for v >= 0x20 {
		out.WriteByte(byte((0x20 | (v & 0x1f)) + 63))
		v >>= 5
	}
	out.WriteByte(byte(v + 63))
}
