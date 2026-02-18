package application

import (
	"testing"

	"github.com/works-on-my-machine-390/concordia-waze/internal/domain"
)

type fakeBuildingRepo struct {
	b      *domain.Building
	err    error
	allMap map[string][]domain.BuildingSummary
}

func (f *fakeBuildingRepo) GetBuilding(code string) (*domain.Building, error) {
	if f.err != nil {
		return nil, f.err
	}
	return f.b, nil
}

func (f *fakeBuildingRepo) GetAllBuildingsByCampus() (map[string][]domain.BuildingSummary, error) {
	if f.allMap != nil {
		return f.allMap, nil
	}
	return nil, f.err
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

func TestBuildingService_GetAllBuildingsByCampus_Success(t *testing.T) {
	repo := &fakeBuildingRepo{
		allMap: map[string][]domain.BuildingSummary{
			"SGW": {
				{Code: "MB", Name: "MB Building", LongName: "John Molson Building", Campus: "SGW"},
			},
			"LOY": {
				{Code: "VL", Name: "Vanier Library", LongName: "Vanier Library Building", Campus: "LOY"},
			},
		},
	}
	svc := NewBuildingService(repo)

	grouped, err := svc.GetAllBuildingsByCampus()
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	sgwList, ok := grouped["SGW"]
	if !ok {
		t.Fatalf("expected SGW key present")
	}
	if len(sgwList) != 1 {
		t.Fatalf("expected 1 SGW building, got %d", len(sgwList))
	}
	if sgwList[0].Code != "MB" || sgwList[0].Campus != "SGW" {
		t.Fatalf("unexpected SGW entry: %+v", sgwList[0])
	}

	loyList, ok := grouped["LOY"]
	if !ok {
		t.Fatalf("expected LOY key present")
	}
	if len(loyList) != 1 {
		t.Fatalf("expected 1 LOY building, got %d", len(loyList))
	}
	if loyList[0].Code != "VL" || loyList[0].Campus != "LOY" {
		t.Fatalf("unexpected LOY entry: %+v", loyList[0])
	}
}
