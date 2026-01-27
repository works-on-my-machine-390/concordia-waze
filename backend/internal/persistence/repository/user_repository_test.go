package repository_test

import (
	"testing"

	"github.com/works-on-my-machine-390/concordia-waze/internal/domain"
	"github.com/works-on-my-machine-390/concordia-waze/internal/persistence/repository"
)

func TestCreate_Success(t *testing.T) {
	repo := repository.NewInMemoryUserRepository()

	user := &domain.User{
		ID:        "user-123",
		Name:      "John Doe",
		Email:     "john.doe@concordia.ca",
		Password:  "hashed_password",
	}

	err := repo.Create(user)

	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}
}

func TestCreate_GeneratesID(t *testing.T) {
	repo := repository.NewInMemoryUserRepository()

	user := &domain.User{
		Name:      "John Doe",
		Email:     "john.doe@concordia.ca",
		Password:  "hashed_password",
	}

	err := repo.Create(user)

	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}
	if user.ID == "" {
		t.Fatal("Expected user ID to be generated")
	}
}

func TestFindByEmail_Success(t *testing.T) {
	repo := repository.NewInMemoryUserRepository()

	user1 := &domain.User{
		ID:        "user-123",
		Name:      "John Doe",
		Email:     "john.doe@concordia.ca",
		Password:  "hashed_password",
	}

	repo.Create(user1)

	user2, err := repo.FindByEmail("john.doe@concordia.ca")

	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}
	if user2.ID != user1.ID {
		t.Errorf("Expected ID %s, got %s", user1.ID, user2.ID)
	}
}

func TestFindByEmail_NotFound(t *testing.T) {
	repo := repository.NewInMemoryUserRepository()

	_, err := repo.FindByEmail("nonexistent@concordia.ca")

	if err != domain.ErrUserNotFound {
		t.Errorf("Expected ErrUserNotFound, got %v", err)
	}
}

func TestFindByID_Success(t *testing.T) {
	repo := repository.NewInMemoryUserRepository()

	user1 := &domain.User{
		ID:        "user-123",
		Name:      "John Doe",
		Email:     "john.doe@concordia.ca",
		Password:  "hashed_password",
	}

	repo.Create(user1)

	user2, err := repo.FindByID("user-123")

	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}
	if user2.ID != user1.ID {
		t.Errorf("Expected ID %s, got %s", user1.ID, user2.ID)
	}
}

func TestFindByID_NotFound(t *testing.T) {
	repo := repository.NewInMemoryUserRepository()

	_, err := repo.FindByID("nonexistent-id")

	if err != domain.ErrUserNotFound {
		t.Errorf("Expected ErrUserNotFound, got %v", err)
	}
}

func TestUpdate_Success(t *testing.T) {
	repo := repository.NewInMemoryUserRepository()

	user1 := &domain.User{
		ID:        "user-123",
		Name:      "John Doe",
		Email:     "john.doe@concordia.ca",
		Password:  "hashed_password",
	}

	repo.Create(user1)

	// Update
	user1.Name = "Jane Doe"
	err := repo.Update(user1)

	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}

	// Verify
	user2, _ := repo.FindByID("user-123")
	if user2.Name != "Jane Doe" {
		t.Errorf("Expected name 'Jane Doe', got %s", user2.Name)
	}
}

func TestUpdate_NotFound(t *testing.T) {
	repo := repository.NewInMemoryUserRepository()

	user := &domain.User{
		ID:   "nonexistent-id",
		Name: "John Doe",
	}

	err := repo.Update(user)

	if err != domain.ErrUserNotFound {
		t.Errorf("Expected ErrUserNotFound, got %v", err)
	}
}
