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

// AddFavorite creates a new favorite location for a user.
// The caller is responsible for setting fav.Type, fav.UserID, fav.Name, and the
// type-appropriate location fields before calling this method.
func (s *FavoritesService) AddFavorite(fav *domain.Favorite) (*domain.Favorite, error) {
	if fav.Name == "" {
		return nil, domain.ErrEmptyFavoriteName
	}

	if fav.Type != domain.FavoriteTypeOutdoor && fav.Type != domain.FavoriteTypeIndoor {
		return nil, domain.ErrInvalidFavoriteType
	}

	if err := s.repo.Create(fav); err != nil {
		return nil, err
	}

	return fav, nil
}

// GetFavorites returns all favorites for the given user identifier
func (s *FavoritesService) GetFavorites(userID string) ([]*domain.Favorite, error) {
	return s.repo.FindByUserID(userID)
}

// DeleteFavorite removes a favorite by ID, scoped to the authenticated user
func (s *FavoritesService) DeleteFavorite(id, userID string) error {
	return s.repo.Delete(id, userID)
}
