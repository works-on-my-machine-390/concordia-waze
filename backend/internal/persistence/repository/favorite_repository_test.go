package repository_test

import (
	"testing"

	"github.com/works-on-my-machine-390/concordia-waze/internal/domain"
	"github.com/works-on-my-machine-390/concordia-waze/internal/persistence/repository"
)

func TestFavoriteCreate_Success(t *testing.T) {
	repo := repository.NewInMemoryFavoriteRepository()

	fav := &domain.Favorite{
		UserID:    "device-uuid-1",
		Name:      "Home",
		Latitude:  45.4971,
		Longitude: -73.5789,
	}

	err := repo.Create(fav)
	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}
}

func TestFavoriteCreate_GeneratesID(t *testing.T) {
	repo := repository.NewInMemoryFavoriteRepository()

	fav := &domain.Favorite{
		UserID: "device-uuid-1",
		Name:   "Home",
	}

	repo.Create(fav)

	if fav.ID == "" {
		t.Fatal("Expected favorite ID to be generated")
	}
}

func TestFavoriteCreate_PreservesProvidedID(t *testing.T) {
	repo := repository.NewInMemoryFavoriteRepository()

	fav := &domain.Favorite{
		ID:     "my-custom-id",
		UserID: "device-uuid-1",
		Name:   "Home",
	}

	repo.Create(fav)

	if fav.ID != "my-custom-id" {
		t.Errorf("Expected ID 'my-custom-id', got %s", fav.ID)
	}
}

func TestFavoriteFindByUserID_Success(t *testing.T) {
	repo := repository.NewInMemoryFavoriteRepository()

	repo.Create(&domain.Favorite{UserID: "device-uuid-1", Name: "Home"})
	repo.Create(&domain.Favorite{UserID: "device-uuid-1", Name: "Office"})
	repo.Create(&domain.Favorite{UserID: "device-uuid-2", Name: "Other"})

	results, err := repo.FindByUserID("device-uuid-1")
	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}
	if len(results) != 2 {
		t.Errorf("Expected 2 favorites for device-uuid-1, got %d", len(results))
	}
}

func TestFavoriteFindByUserID_EmptyResult(t *testing.T) {
	repo := repository.NewInMemoryFavoriteRepository()

	results, err := repo.FindByUserID("device-uuid-1")
	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}
	if len(results) != 0 {
		t.Errorf("Expected 0 favorites, got %d", len(results))
	}
}

func TestFavoriteFindByUserID_IsolatedBetweenUsers(t *testing.T) {
	repo := repository.NewInMemoryFavoriteRepository()

	repo.Create(&domain.Favorite{UserID: "device-uuid-1", Name: "Home"})

	results, err := repo.FindByUserID("device-uuid-2")
	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}
	if len(results) != 0 {
		t.Errorf("Expected 0 favorites for device-uuid-2, got %d", len(results))
	}
}

func TestFavoriteDelete_Success(t *testing.T) {
	repo := repository.NewInMemoryFavoriteRepository()

	fav := &domain.Favorite{UserID: "device-uuid-1", Name: "Home"}
	repo.Create(fav)

	err := repo.Delete(fav.ID)
	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}

	results, _ := repo.FindByUserID("device-uuid-1")
	if len(results) != 0 {
		t.Errorf("Expected 0 favorites after deletion, got %d", len(results))
	}
}

func TestFavoriteDelete_NotFound(t *testing.T) {
	repo := repository.NewInMemoryFavoriteRepository()

	err := repo.Delete("nonexistent-id")
	if err != domain.ErrFavoriteNotFound {
		t.Errorf("Expected ErrFavoriteNotFound, got %v", err)
	}
}

func TestFavoriteDelete_OnlyRemovesTargetFavorite(t *testing.T) {
	repo := repository.NewInMemoryFavoriteRepository()

	fav1 := &domain.Favorite{UserID: "device-uuid-1", Name: "Home"}
	fav2 := &domain.Favorite{UserID: "device-uuid-1", Name: "Office"}
	repo.Create(fav1)
	repo.Create(fav2)

	repo.Delete(fav1.ID)

	results, _ := repo.FindByUserID("device-uuid-1")
	if len(results) != 1 {
		t.Errorf("Expected 1 remaining favorite, got %d", len(results))
	}
	if results[0].Name != "Office" {
		t.Errorf("Expected remaining favorite to be 'Office', got %s", results[0].Name)
	}
}
