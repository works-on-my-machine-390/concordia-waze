package repository

import (
	"encoding/json"
	"fmt"
	"os"
	"strings"
	"sync"
)

type ShuttleDataRepository struct {
	filePath string

	mu   sync.RWMutex
	data map[string]map[string][]string
}

func NewShuttleDataRepository(path string) *ShuttleDataRepository {
	return &ShuttleDataRepository{
		filePath: path,
	}
}

func (r *ShuttleDataRepository) Load() error {
	r.mu.Lock()
	defer r.mu.Unlock()

	b, err := os.ReadFile(r.filePath)
	if err != nil {
		return fmt.Errorf("reading shuttle data file %q: %w", r.filePath, err)
	}

	var raw map[string]map[string][]string
	if err := json.Unmarshal(b, &raw); err != nil {
		return fmt.Errorf("unmarshalling shuttle data file %q: %w", r.filePath, err)
	}

	normalized := make(map[string]map[string][]string, len(raw))
	for rawDay, campusMap := range raw {
		day := strings.ToLower(strings.TrimSpace(rawDay))
		if day == "" {
			continue
		}
		if _, ok := normalized[day]; !ok {
			normalized[day] = make(map[string][]string, len(campusMap))
		}
		for rawCampus, times := range campusMap {
			campus := strings.ToUpper(strings.TrimSpace(rawCampus))
			cpy := make([]string, len(times))
			copy(cpy, times)
			normalized[day][campus] = cpy
		}
	}

	r.data = normalized
	return nil
}

func (r *ShuttleDataRepository) ensureLoaded() error {
	r.mu.RLock()
	if r.data != nil {
		r.mu.RUnlock()
		return nil
	}
	r.mu.RUnlock()
	return r.Load()
}

func (r *ShuttleDataRepository) GetDepartures(day, campus string) ([]string, error) {
	if err := r.ensureLoaded(); err != nil {
		return nil, err
	}

	dayKey := strings.ToLower(strings.TrimSpace(day))
	campusKey := strings.ToUpper(strings.TrimSpace(campus))

	r.mu.RLock()
	defer r.mu.RUnlock()

	dayMap, ok := r.data[dayKey]
	if !ok {
		return nil, fmt.Errorf("no schedule for day %q", dayKey)
	}

	times, ok := dayMap[campusKey]
	if !ok {
		return nil, fmt.Errorf("no departures for campus %q on day %q", campusKey, dayKey)
	}

	out := make([]string, len(times))
	copy(out, times)
	return out, nil
}

func deepCopySchedule(src map[string]map[string][]string) map[string]map[string][]string {
	if src == nil {
		return nil
	}
	dst := make(map[string]map[string][]string, len(src))
	for day, campusMap := range src {
		if campusMap == nil {
			dst[day] = nil
			continue
		}
		cm := make(map[string][]string, len(campusMap))
		for campus, times := range campusMap {
			if times == nil {
				cm[campus] = nil
				continue
			}
			ts := make([]string, len(times))
			copy(ts, times)
			cm[campus] = ts
		}
		dst[day] = cm
	}
	return dst
}

func (r *ShuttleDataRepository) GetDepartureData() (map[string]map[string][]string, error) {
	if err := r.ensureLoaded(); err != nil {
		return nil, err
	}

	r.mu.RLock()
	defer r.mu.RUnlock()

	return deepCopySchedule(r.data), nil
}
