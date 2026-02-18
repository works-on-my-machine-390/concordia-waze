package application

import "github.com/works-on-my-machine-390/concordia-waze/internal/domain"

type BuildingReader interface {
	GetBuilding(code string) (*domain.Building, error)
	GetAllBuildingsByCampus() (map[string][]domain.BuildingSummary, error)
}

type BuildingService struct {
	repo BuildingReader
}

func NewBuildingService(repo BuildingReader) *BuildingService {
	return &BuildingService{repo: repo}
}

func (s *BuildingService) GetBuilding(code string) (*domain.Building, error) {
	return s.repo.GetBuilding(code)
}

func (s *BuildingService) GetAllBuildingsByCampus() (map[string][]domain.BuildingSummary, error) {
	return s.repo.GetAllBuildingsByCampus()
}
