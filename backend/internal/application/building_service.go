package application

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"sync"

	"github.com/works-on-my-machine-390/concordia-waze/internal/application/google"
	"github.com/works-on-my-machine-390/concordia-waze/internal/constants"
	"github.com/works-on-my-machine-390/concordia-waze/internal/domain"
	"github.com/works-on-my-machine-390/concordia-waze/internal/utils"
)

type BuildingReader interface {
	GetBuilding(code string) (*domain.Building, error)
	GetAllBuildingsByCampus() (map[string][]domain.BuildingSummary, error)
}

type FloorReader interface {
	GetBuildingFloors(code string) ([]domain.Floor, error)
}

type BuildingService struct {
	repo   BuildingReader
	places google.PlacesClient

	placeIDCache      map[string]string
	hoursCache        map[string]domain.OpeningHours
	placeIDCacheMutex sync.RWMutex
	hoursCacheMutex   sync.RWMutex

	cacheDir         string
	placeIDCachePath string
	hoursCachePath   string
	persistOnWrite   bool
	persistMutex     sync.Mutex
}

func NewBuildingService(repo BuildingReader, places google.PlacesClient, cacheDir string) *BuildingService {
	s := &BuildingService{
		repo:             repo,
		places:           places,
		placeIDCache:     make(map[string]string),
		hoursCache:       make(map[string]domain.OpeningHours),
		cacheDir:         cacheDir,
		placeIDCachePath: filepath.Join(cacheDir, "placeid_cache.json"),
		hoursCachePath:   filepath.Join(cacheDir, "hours_cache.json"),
		persistOnWrite:   true,
	}

	if err := os.MkdirAll(cacheDir, 0o755); err != nil {
		fmt.Fprintf(os.Stderr, "BuildingService: failed to create cache dir %s: %v\n", cacheDir, err)
	} else {
		if err := s.loadPlaceIDCache(); err != nil {
			fmt.Fprintf(os.Stderr, "BuildingService: failed to load placeID cache: %v\n", err)
		}
		if err := s.loadHoursCache(); err != nil {
			fmt.Fprintf(os.Stderr, "BuildingService: failed to load hours cache: %v\n", err)
		}
	}

	return s
}

func (s *BuildingService) GetBuilding(code string) (*domain.Building, error) {
	b, err := s.buildingRepo.GetBuilding(code)
	if err != nil {
		return nil, err
	}

	nb := *b

	// 1) Try with building's own data
	if s.attachOpeningHoursIfFound(&nb, nb.LongName, nb.Latitude, nb.Longitude) {
		return &nb, nil
	}

	// 2) Try campus-based fallback
	if name, pos, ok := campusFallback(nb.Latitude, nb.Longitude); ok {
		s.attachOpeningHoursIfFound(&nb, name, pos.Lat, pos.Lng)
	}

	return &nb, nil
}

func (s *BuildingService) attachOpeningHoursIfFound(dst *domain.Building, input string, lat, lng float64) bool {
	if s.places == nil || input == "" {
		return false
	}

	lookupKey := s.lookupKey(input, lat, lng)

	// 1) Try get placeID from cache
	placeID := s.getCachedPlaceID(lookupKey)

	// 2) If not cached, call FindPlaceID and cache the result if successful
	if placeID == "" {
		pid, err := s.places.FindPlaceID(input, lat, lng)
		if err != nil || pid == "" {
			return false
		}
		placeID = pid
		s.setCachedPlaceID(lookupKey, placeID)
	}

	// 3) Try attach hours from hours cache
	if hours, ok := s.getCachedHours(placeID); ok {
		dst.OpeningHours = hours
		return true
	}

	// 4) Not cached so fetch from API
	hours, err := s.places.GetOpeningHours(placeID)
	if err != nil || len(hours) == 0 {
		return false
	}

	s.setCachedHours(placeID, hours)
	dst.OpeningHours = hours
	return true
}

func (s *BuildingService) lookupKey(input string, lat, lng float64) string {
	n := strings.ToLower(strings.TrimSpace(input))
	return fmt.Sprintf("%s|%.6f|%.6f", n, lat, lng)
}

func (s *BuildingService) getCachedPlaceID(key string) string {
	s.placeIDCacheMutex.RLock()
	defer s.placeIDCacheMutex.RUnlock()
	return s.placeIDCache[key]
}

func (s *BuildingService) setCachedPlaceID(key, placeID string) {
	s.placeIDCacheMutex.Lock()
	s.placeIDCache[key] = placeID
	s.placeIDCacheMutex.Unlock()

	if s.persistOnWrite {
		if err := s.savePlaceIDCache(); err != nil {
			fmt.Fprintf(os.Stderr, "BuildingService: failed to persist placeID cache: %v\n", err)
		}
	}
}

func (s *BuildingService) getCachedHours(placeID string) (domain.OpeningHours, bool) {
	s.hoursCacheMutex.RLock()
	defer s.hoursCacheMutex.RUnlock()
	h, ok := s.hoursCache[placeID]
	return h, ok
}

func (s *BuildingService) setCachedHours(placeID string, hours domain.OpeningHours) {
	s.hoursCacheMutex.Lock()
	s.hoursCache[placeID] = hours
	s.hoursCacheMutex.Unlock()

	if s.persistOnWrite {
		if err := s.saveHoursCache(); err != nil {
			fmt.Fprintf(os.Stderr, "BuildingService: failed to persist hours cache: %v\n", err)
		}
	}
}

func (s *BuildingService) loadPlaceIDCache() error {
	if s.placeIDCachePath == "" {
		return nil
	}
	f, err := os.Open(s.placeIDCachePath)
	if err != nil {
		if os.IsNotExist(err) {
			return nil
		}
		return err
	}
	defer f.Close()

	dec := json.NewDecoder(f)
	m := map[string]string{}
	if err := dec.Decode(&m); err != nil {
		return err
	}

	s.placeIDCacheMutex.Lock()
	for k, v := range m {
		s.placeIDCache[k] = v
	}
	s.placeIDCacheMutex.Unlock()

	return nil
}

func (s *BuildingService) loadHoursCache() error {
	if s.hoursCachePath == "" {
		return nil
	}
	f, err := os.Open(s.hoursCachePath)
	if err != nil {
		if os.IsNotExist(err) {
			return nil
		}
		return err
	}
	defer f.Close()

	dec := json.NewDecoder(f)
	m := map[string]domain.OpeningHours{}
	if err := dec.Decode(&m); err != nil {
		return err
	}

	s.hoursCacheMutex.Lock()
	for k, v := range m {
		s.hoursCache[k] = v
	}
	s.hoursCacheMutex.Unlock()

	return nil
}

func (s *BuildingService) savePlaceIDCache() error {
	if s.placeIDCachePath == "" {
		return nil
	}

	s.placeIDCacheMutex.RLock()
	snapshot := make(map[string]string, len(s.placeIDCache))
	for k, v := range s.placeIDCache {
		snapshot[k] = v
	}
	s.placeIDCacheMutex.RUnlock()

	data, err := json.MarshalIndent(snapshot, "", "  ")
	if err != nil {
		return err
	}

	tmp := s.placeIDCachePath + ".tmp"
	if err := os.WriteFile(tmp, data, 0o644); err != nil {
		return err
	}
	return os.Rename(tmp, s.placeIDCachePath)
}

func (s *BuildingService) saveHoursCache() error {
	if s.hoursCachePath == "" {
		return nil
	}

	s.hoursCacheMutex.RLock()
	snapshot := make(map[string]domain.OpeningHours, len(s.hoursCache))
	for k, v := range s.hoursCache {
		snapshot[k] = v
	}
	s.hoursCacheMutex.RUnlock()

	data, err := json.MarshalIndent(snapshot, "", "  ")
	if err != nil {
		return err
	}

	tmp := s.hoursCachePath + ".tmp"
	if err := os.WriteFile(tmp, data, 0o644); err != nil {
		return err
	}
	return os.Rename(tmp, s.hoursCachePath)
}

func campusFallback(lat, lng float64) (string, domain.LatLng, bool) {
	// If building coordinates are not set, cannot determine proximity.
	if lat == 0 && lng == 0 {
		return "", domain.LatLng{}, false
	}

	loy := constants.LOYCampusPosition
	sgw := constants.SGWCampusPosition

	dLoy := utils.SqDist(lat, lng, loy.Lat, loy.Lng)
	dSgw := utils.SqDist(lat, lng, sgw.Lat, sgw.Lng)

	if dLoy <= dSgw {
		return constants.LoyolaCampusName, loy, true
	}
	return constants.SirGeorgeWilliamsCampusName, sgw, true
}

func (s *BuildingService) GetAllBuildingsByCampus() (map[string][]domain.BuildingSummary, error) {
	return s.buildingRepo.GetAllBuildingsByCampus()
}

func (s *BuildingService) GetBuildingFloors(code string) ([]domain.Floor, error) {
	return s.floorRepo.GetBuildingFloors(code)
}
