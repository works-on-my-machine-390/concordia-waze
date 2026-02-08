package application

import "github.com/works-on-my-machine-390/concordia-waze/internal/domain"

type CampusPolygonReader interface {
	GetCampusPolygons(campus string) ([]domain.BuildingPolygon, error)
}

type CampusService struct {
	repo CampusPolygonReader
}

func NewCampusService(repo CampusPolygonReader) *CampusService {
	return &CampusService{repo: repo}
}

func (s *CampusService) GetCampusBuildings(campus string) ([]domain.BuildingPolygon, error) {
	return s.repo.GetCampusPolygons(campus)
}
