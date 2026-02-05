package application

import (
	"testing"

	"github.com/works-on-my-machine-390/concordia-waze/internal/domain"
)


type fakeBuildingRepo struct {
	b   *domain.Building
	err error
}

func (f *fakeBuildingRepo) GetBuilding(code string) (*domain.Building, error) {
	if f.err != nil {
		return nil, f.err
	}
	return f.b, nil
}

type fakeCampusRepo struct {
	polys []domain.BuildingPolygon
	err   error
}

func (f *fakeCampusRepo) GetCampusPolygons(campus string) ([]domain.BuildingPolygon, error) {
	if f.err != nil {
		return nil, f.err
	}
	return f.polys, nil
}


func TestBuildingService_GetBuilding_Success(t *testing.T) {
	repo := &fakeBuildingRepo{
		b: &domain.Building{Code: "MB", Name: "John Molson Building"},
	}
	svc := NewBuildingService(repo)

	b, err := svc.GetBuilding("MB")
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if b == nil || b.Code != "MB" {
		t.Fatalf("expected MB building, got %+v", b)
	}
}

func TestBuildingService_GetBuilding_NotFound(t *testing.T) {
	repo := &fakeBuildingRepo{err: domain.ErrNotFound}
	svc := NewBuildingService(repo)

	_, err := svc.GetBuilding("XYZ")
	if err == nil {
		t.Fatalf("expected error, got nil")
	}
	if err != domain.ErrNotFound {
		t.Fatalf("expected ErrNotFound, got %v", err)
	}
}


func TestCampusService_GetCampusBuildings_Success(t *testing.T) {
	repo := &fakeCampusRepo{
		polys: []domain.BuildingPolygon{
			{Code: "MB", Polygon: []domain.LatLng{{Lat: 45.0, Lng: -73.0}}},
		},
	}
	svc := NewCampusService(repo)

	out, err := svc.GetCampusBuildings("SGW")
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if len(out) != 1 || out[0].Code != "MB" {
		t.Fatalf("unexpected result: %+v", out)
	}
}

func TestCampusService_GetCampusBuildings_NotFound(t *testing.T) {
	repo := &fakeCampusRepo{err: domain.ErrNotFound}
	svc := NewCampusService(repo)

	_, err := svc.GetCampusBuildings("ABC")
	if err == nil {
		t.Fatalf("expected error, got nil")
	}
	if err != domain.ErrNotFound {
		t.Fatalf("expected ErrNotFound, got %v", err)
	}
}
