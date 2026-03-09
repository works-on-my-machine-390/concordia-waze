package application

import "github.com/works-on-my-machine-390/concordia-waze/internal/constants"

type ShuttleReader interface {
	GetDepartures(day, campus string) ([]string, error)
	GetDepartureData() (map[string]map[string][]string, error)
}

type ShuttleService struct {
	repo ShuttleReader
}

func NewShuttleService(repo ShuttleReader) *ShuttleService {
	return &ShuttleService{repo: repo}
}

func (s *ShuttleService) GetDepartures(day, campus string) ([]string, error) {
	return s.repo.GetDepartures(day, campus)
}

func (s *ShuttleService) GetDepartureData() (map[string]map[string][]string, error) {
	return s.repo.GetDepartureData()
}

func (s *ShuttleService) GetShuttleMarkerPositions() map[string]map[string]float64 {
	positions := map[string]map[string]float64{
		"LOY": {
			"lat": constants.LOYShuttleStopPosition.Lat,
			"lng": constants.LOYShuttleStopPosition.Lng,
		},
		"SGW": {
			"lat": constants.SGWShuttleStopPosition.Lat,
			"lng": constants.SGWShuttleStopPosition.Lng,
		},
	}
	return positions
}
