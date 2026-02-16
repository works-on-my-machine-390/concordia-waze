package application

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
