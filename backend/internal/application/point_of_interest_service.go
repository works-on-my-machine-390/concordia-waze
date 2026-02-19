package application

import (
	"fmt"

	"github.com/works-on-my-machine-390/concordia-waze/internal/application/google"
	"github.com/works-on-my-machine-390/concordia-waze/internal/domain"
)

type PointOfInterestService interface {
	GetNearbyPointsOfInterest(input string, lat, lng float64, maxDistanceInMeters int, rankPreference string) ([]domain.Building, error)
}

type pointOfInterestService struct {
	placesClient google.PlacesClient
}

func NewPointOfInterestService(placesClient google.PlacesClient) PointOfInterestService {
	return &pointOfInterestService{placesClient: placesClient}
}

func (s *pointOfInterestService) GetNearbyPointsOfInterest(input string, lat, lng float64, maxDistanceInMeters int, rankPreference string) ([]domain.Building, error) {
	if input == "" {
		return nil, fmt.Errorf("input cannot be empty")
	}
	if maxDistanceInMeters == 0 {
		maxDistanceInMeters = 1000
	}
	if rankPreference == "" {
		rankPreference = "DISTANCE"
	}

	return s.placesClient.TextSearchPlaces(input, lat, lng, maxDistanceInMeters, rankPreference)
}
