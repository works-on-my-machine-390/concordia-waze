package application

import (
	"errors"
	"fmt"
	"math"
	"sort"
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

// ---- Public entrypoint used by handlers ----
func (s *DirectionsService) GetDirections(start, end domain.LatLng, mode string) (domain.DirectionsResponse, error) {
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

	// ✅ shuttle is composed (walk -> shuttle -> walk)
	if m == "shuttle" {
		return s.getShuttleDirections(start, end)
	}

	return s.fetcher.GetDirections(start, end, m)
}

// ---- Shuttle composition logic ----

// Default shuttle stop coordinates (you can later replace these with real campus/building coords)
var sgwShuttleStop = domain.LatLng{Lat: 45.495376, Lng: -73.577997}
var loyShuttleStop = domain.LatLng{Lat: 45.459026, Lng: -73.638606}

func (s *DirectionsService) getShuttleDirections(start, end domain.LatLng) (domain.DirectionsResponse, error) {
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

	// Shuttle “middle leg”
	shuttleStep := s.buildShuttleStep()

	steps := make([]domain.DirectionStep, 0, len(walkToStop.Steps)+1+len(walkFromStop.Steps))
	steps = append(steps, walkToStop.Steps...)
	steps = append(steps, shuttleStep)
	steps = append(steps, walkFromStop.Steps...)

	poly := make([]domain.LatLng, 0, len(walkToStop.Polyline)+2+len(walkFromStop.Polyline))
	poly = append(poly, walkToStop.Polyline...)
	poly = append(poly, sgwShuttleStop, loyShuttleStop) // simple connection for shuttle leg
	poly = append(poly, walkFromStop.Polyline...)

	return domain.DirectionsResponse{
		Mode:     "shuttle",
		Polyline: poly,
		Steps:    steps,
	}, nil
}

func (s *DirectionsService) buildShuttleStep() domain.DirectionStep {
	distKm := haversineKm(sgwShuttleStop, loyShuttleStop)
	distStr := formatKm(distKm)

	// basic estimate
	durationStr := "25 mins"

	day := strings.ToLower(time.Now().Weekday().String())
	nextDepartureText := fmt.Sprintf(" (day: %s)", day)

	if s.shuttleRepo != nil {
		if times, err := s.shuttleRepo.GetDepartures(day, "SGW"); err == nil && len(times) > 0 {
			next := pickNextDeparture(times)
			if next != "" {
				nextDepartureText = fmt.Sprintf(" (next departure: %s, day: %s)", next, day)
			}
		}
	}

	return domain.DirectionStep{
		Instruction: fmt.Sprintf("Take the Concordia Shuttle Bus from SGW to LOY%s", nextDepartureText),
		Distance:    distStr,
		Duration:    durationStr,
		Start:       sgwShuttleStop,
		End:         loyShuttleStop,
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

func pickNextDeparture(times []string) string {
	now := time.Now()

	// sort times so “next” works even if repo returns unsorted list
	sort.Slice(times, func(i, j int) bool {
		return strings.TrimSpace(times[i]) < strings.TrimSpace(times[j])
	})

	for _, t := range times {
		tt := strings.TrimSpace(t)
		parsed, err := time.Parse("15:04", tt)
		if err != nil {
			continue
		}
		cand := time.Date(now.Year(), now.Month(), now.Day(), parsed.Hour(), parsed.Minute(), 0, 0, now.Location())
		if !cand.Before(now) {
			return tt
		}
	}
	return ""
}
