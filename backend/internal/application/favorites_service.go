package application

import (
	"github.com/works-on-my-machine-390/concordia-waze/internal/domain"
	"github.com/works-on-my-machine-390/concordia-waze/internal/persistence/repository"
)

// FavoritesService handles favorites-related business logic
type FavoritesService struct {
	repo repository.FavoriteRepository
}

// NewFavoritesService creates a new favorites service
func NewFavoritesService(repo repository.FavoriteRepository) *FavoritesService {
	return &FavoritesService{repo: repo}
}

// AddFavorite creates a new favorite location for an authenticated user
func (s *FavoritesService) AddFavorite(userID, name string, latitude, longitude float64) (*domain.Favorite, error) {
	if name == "" {
		return nil, domain.ErrEmptyFavoriteName
	}

	favorite := &domain.Favorite{
		UserID:    userID,
		Name:      name,
		Latitude:  latitude,
		Longitude: longitude,
	}

	if err := s.repo.Create(favorite); err != nil {
		return nil, err
	}

	return favorite, nil
}

// GetFavorites returns all favorites for the given user identifier
func (s *FavoritesService) GetFavorites(userID string) ([]*domain.Favorite, error) {
	return s.repo.FindByUserID(userID)
}

// DeleteFavorite removes a favorite by ID, scoped to the authenticated user
func (s *FavoritesService) DeleteFavorite(id, userID string) error {
	return s.repo.Delete(id, userID)
}
