package application_test

import (
	"errors"
	"testing"

	"github.com/works-on-my-machine-390/concordia-waze/internal/application"
	"github.com/works-on-my-machine-390/concordia-waze/internal/domain"
	"github.com/works-on-my-machine-390/concordia-waze/internal/persistence/repository"
)

func TestAddFavoriteSuccess_Outdoor(t *testing.T) {
	repo := repository.NewInMemoryFavoriteRepository()
	service := application.NewFavoritesService(repo)

	fav, err := service.AddFavorite(&domain.Favorite{
		UserID:    "user-1",
		Type:      domain.FavoriteTypeOutdoor,
		Name:      "Home",
		Latitude:  45.4971,
		Longitude: -73.5789,
	})
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
	if fav.Type != domain.FavoriteTypeOutdoor {
		t.Errorf("Expected type outdoor, got %s", fav.Type)
	}
}

func TestAddFavoriteSuccess_Indoor(t *testing.T) {
	repo := repository.NewInMemoryFavoriteRepository()
	service := application.NewFavoritesService(repo)

	fav, err := service.AddFavorite(&domain.Favorite{
		UserID:       "user-1",
		Type:         domain.FavoriteTypeIndoor,
		Name:         "Room 281",
		BuildingCode: "H",
		FloorNumber:  2,
		X:            0.8749,
		Y:            0.4326,
		PoiType:      "room",
	})
	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}
	if fav.Type != domain.FavoriteTypeIndoor {
		t.Errorf("Expected type indoor, got %s", fav.Type)
	}
	if fav.BuildingCode != "H" {
		t.Errorf("Expected buildingCode 'H', got %s", fav.BuildingCode)
	}
	if fav.FloorNumber != 2 {
		t.Errorf("Expected floorNumber 2, got %d", fav.FloorNumber)
	}
}

func TestAddFavoriteEmptyName(t *testing.T) {
	repo := repository.NewInMemoryFavoriteRepository()
	service := application.NewFavoritesService(repo)

	_, err := service.AddFavorite(&domain.Favorite{
		UserID:    "user-1",
		Type:      domain.FavoriteTypeOutdoor,
		Name:      "",
		Latitude:  45.4971,
		Longitude: -73.5789,
	})
	if err != domain.ErrEmptyFavoriteName {
		t.Errorf("Expected ErrEmptyFavoriteName, got %v", err)
	}
}

func TestAddFavoriteInvalidType(t *testing.T) {
	repo := repository.NewInMemoryFavoriteRepository()
	service := application.NewFavoritesService(repo)

	_, err := service.AddFavorite(&domain.Favorite{
		UserID: "user-1",
		Type:   "unknown",
		Name:   "Place",
	})
	if err != domain.ErrInvalidFavoriteType {
		t.Errorf("Expected ErrInvalidFavoriteType, got %v", err)
	}
}

func TestGetFavoritesSuccess(t *testing.T) {
	repo := repository.NewInMemoryFavoriteRepository()
	service := application.NewFavoritesService(repo)

	service.AddFavorite(&domain.Favorite{UserID: "user-1", Type: domain.FavoriteTypeOutdoor, Name: "Home", Latitude: 45.4971, Longitude: -73.5789})
	service.AddFavorite(&domain.Favorite{UserID: "user-1", Type: domain.FavoriteTypeOutdoor, Name: "Office", Latitude: 45.4972, Longitude: -73.5790})
	service.AddFavorite(&domain.Favorite{UserID: "user-2", Type: domain.FavoriteTypeOutdoor, Name: "Other", Latitude: 45.0, Longitude: -73.0})

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

	fav, _ := service.AddFavorite(&domain.Favorite{UserID: "user-1", Type: domain.FavoriteTypeOutdoor, Name: "Home", Latitude: 45.4971, Longitude: -73.5789})

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

	fav, _ := service.AddFavorite(&domain.Favorite{UserID: "user-1", Type: domain.FavoriteTypeOutdoor, Name: "Home", Latitude: 45.4971, Longitude: -73.5789})

	err := service.DeleteFavorite(fav.ID, "user-2")
	if err != domain.ErrFavoriteNotFound {
		t.Errorf("Expected ErrFavoriteNotFound when wrong user deletes, got %v", err)
	}
}

// Mock repository that always fails on Create
type failRepo struct{}

func (f *failRepo) Create(fav *domain.Favorite) error {
	return errors.New("db error")
}
func (f *failRepo) FindByUserID(userID string) ([]*domain.Favorite, error) {
	return nil, nil
}
func (f *failRepo) Delete(id, userID string) error {
	return nil
}

func TestAddFavoriteRepositoryError(t *testing.T) {
	service := application.NewFavoritesService(&failRepo{})

	_, err := service.AddFavorite(&domain.Favorite{
		UserID:    "user-1",
		Type:      domain.FavoriteTypeOutdoor,
		Name:      "Home",
		Latitude:  10,
		Longitude: 20,
	})
	if err == nil || err.Error() != "db error" {
		t.Errorf("Expected 'db error', got %v", err)
	}
}
