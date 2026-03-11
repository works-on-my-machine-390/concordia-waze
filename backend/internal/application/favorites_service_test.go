package application_test

import (
	"testing"

	"github.com/works-on-my-machine-390/concordia-waze/internal/application"
	"github.com/works-on-my-machine-390/concordia-waze/internal/domain"
	"github.com/works-on-my-machine-390/concordia-waze/internal/persistence/repository"
)

func TestAddFavoriteSuccess(t *testing.T) {
	repo := repository.NewInMemoryFavoriteRepository()
	service := application.NewFavoritesService(repo)

	fav, err := service.AddFavorite("user-1", "Home", 45.4971, -73.5789)
	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}
	if fav == nil {
		t.Fatal("Expected favorite, got nil")
	}
	if fav.ID == "" {
		t.Fatal("Expected ID to be set")
	}
	if fav.Name != "Home" {
		t.Errorf("Expected name 'Home', got %s", fav.Name)
	}
	if fav.UserID != "user-1" {
		t.Errorf("Expected userID 'user-1', got %s", fav.UserID)
	}
}

func TestAddFavoriteEmptyName(t *testing.T) {
	repo := repository.NewInMemoryFavoriteRepository()
	service := application.NewFavoritesService(repo)

	_, err := service.AddFavorite("user-1", "", 45.4971, -73.5789)
	if err != domain.ErrEmptyFavoriteName {
		t.Errorf("Expected ErrEmptyFavoriteName, got %v", err)
	}
}

func TestGetFavoritesSuccess(t *testing.T) {
	repo := repository.NewInMemoryFavoriteRepository()
	service := application.NewFavoritesService(repo)

	service.AddFavorite("user-1", "Home", 45.4971, -73.5789)
	service.AddFavorite("user-1", "Office", 45.4972, -73.5790)
	service.AddFavorite("user-2", "Other", 45.0, -73.0)

	favorites, err := service.GetFavorites("user-1")
	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}
	if len(favorites) != 2 {
		t.Errorf("Expected 2 favorites for user-1, got %d", len(favorites))
	}
}

func TestGetFavoritesEmptyList(t *testing.T) {
	repo := repository.NewInMemoryFavoriteRepository()
	service := application.NewFavoritesService(repo)

	favorites, err := service.GetFavorites("user-1")
	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}
	if len(favorites) != 0 {
		t.Errorf("Expected 0 favorites, got %d", len(favorites))
	}
}

func TestDeleteFavoriteSuccess(t *testing.T) {
	repo := repository.NewInMemoryFavoriteRepository()
	service := application.NewFavoritesService(repo)

	fav, _ := service.AddFavorite("user-1", "Home", 45.4971, -73.5789)

	err := service.DeleteFavorite(fav.ID, "user-1")
	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}

	favorites, _ := service.GetFavorites("user-1")
	if len(favorites) != 0 {
		t.Errorf("Expected 0 favorites after deletion, got %d", len(favorites))
	}
}

func TestDeleteFavoriteNotFound(t *testing.T) {
	repo := repository.NewInMemoryFavoriteRepository()
	service := application.NewFavoritesService(repo)

	err := service.DeleteFavorite("nonexistent-id", "user-1")
	if err != domain.ErrFavoriteNotFound {
		t.Errorf("Expected ErrFavoriteNotFound, got %v", err)
	}
}

func TestDeleteFavoriteWrongUser(t *testing.T) {
	repo := repository.NewInMemoryFavoriteRepository()
	service := application.NewFavoritesService(repo)

	fav, _ := service.AddFavorite("user-1", "Home", 45.4971, -73.5789)

	err := service.DeleteFavorite(fav.ID, "user-2")
	if err != domain.ErrFavoriteNotFound {
		t.Errorf("Expected ErrFavoriteNotFound when wrong user deletes, got %v", err)
	}
}
