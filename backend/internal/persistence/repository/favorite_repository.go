package repository

import (
	"sync"

	"github.com/google/uuid"
	"github.com/works-on-my-machine-390/concordia-waze/internal/domain"
)

// FavoriteRepository defines the interface for favorite data access
type FavoriteRepository interface {
	Create(favorite *domain.Favorite) error
	FindByUserID(userID string) ([]*domain.Favorite, error)
	Delete(id string) error
}

// InMemoryFavoriteRepository is an in-memory implementation for development/testing
type InMemoryFavoriteRepository struct {
	mu        sync.RWMutex
	favorites map[string]*domain.Favorite
}

// NewInMemoryFavoriteRepository creates a new in-memory favorite repository
func NewInMemoryFavoriteRepository() *InMemoryFavoriteRepository {
	return &InMemoryFavoriteRepository{
		favorites: make(map[string]*domain.Favorite),
	}
}

// Create adds a new favorite to the repository
func (r *InMemoryFavoriteRepository) Create(favorite *domain.Favorite) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	if favorite.ID == "" {
		favorite.ID = uuid.New().String()
	}

	r.favorites[favorite.ID] = favorite
	return nil
}

// FindByUserID retrieves all favorites for a given user identifier
func (r *InMemoryFavoriteRepository) FindByUserID(userID string) ([]*domain.Favorite, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	result := make([]*domain.Favorite, 0)
	for _, f := range r.favorites {
		if f.UserID == userID {
			result = append(result, f)
		}
	}
	return result, nil
}

// Delete removes a favorite by ID
func (r *InMemoryFavoriteRepository) Delete(id string) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	if _, exists := r.favorites[id]; !exists {
		return domain.ErrFavoriteNotFound
	}

	delete(r.favorites, id)
	return nil
}
