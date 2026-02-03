package repository

import (
	"sync"

	"github.com/google/uuid"
	"github.com/works-on-my-machine-390/concordia-waze/internal/domain"
)

// UserRepository defines the interface for user data access
type UserRepository interface {
	Create(user *domain.User) error
	FindByEmail(email string) (*domain.User, error)
	FindByID(id string) (*domain.User, error)
	Update(user *domain.User) error
}

// InMemoryUserRepository is an in-memory implementation for development/testing
type InMemoryUserRepository struct {
	mu    sync.RWMutex
	users map[string]*domain.User
}

// NewInMemoryUserRepository creates a new in-memory user repository
func NewInMemoryUserRepository() *InMemoryUserRepository {
	return &InMemoryUserRepository{
		users: make(map[string]*domain.User),
	}
}

// Create adds a new user to the repository
func (r *InMemoryUserRepository) Create(user *domain.User) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	// Generate ID if not provided
	if user.ID == "" {
		user.ID = uuid.New().String()
	}

	r.users[user.ID] = user
	return nil
}

// FindByEmail retrieves a user by email
func (r *InMemoryUserRepository) FindByEmail(email string) (*domain.User, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	for _, user := range r.users {
		if user.Email == email {
			return user, nil
		}
	}
	return nil, domain.ErrUserNotFound
}

// FindByID retrieves a user by ID
func (r *InMemoryUserRepository) FindByID(id string) (*domain.User, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	user, exists := r.users[id]
	if !exists {
		return nil, domain.ErrUserNotFound
	}
	return user, nil
}

// Update updates an existing user
func (r *InMemoryUserRepository) Update(user *domain.User) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	if _, exists := r.users[user.ID]; !exists {
		return domain.ErrUserNotFound
	}

	r.users[user.ID] = user
	return nil
}
