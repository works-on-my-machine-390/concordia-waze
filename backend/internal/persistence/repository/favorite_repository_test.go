package repository_test

import (
	"testing"

	"github.com/works-on-my-machine-390/concordia-waze/internal/domain"
	"github.com/works-on-my-machine-390/concordia-waze/internal/persistence/repository"
)

func TestFavoriteCreate_Success(t *testing.T) {
	repo := repository.NewInMemoryFavoriteRepository()

	fav := &domain.Favorite{
		UserID:    "user-1",
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
		UserID: "user-1",
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
		UserID: "user-1",
		Name:   "Home",
	}

	repo.Create(fav)

	if fav.ID != "my-custom-id" {
		t.Errorf("Expected ID 'my-custom-id', got %s", fav.ID)
	}
}

func TestFavoriteFindByUserID_Success(t *testing.T) {
	repo := repository.NewInMemoryFavoriteRepository()

	repo.Create(&domain.Favorite{UserID: "user-1", Name: "Home"})
	repo.Create(&domain.Favorite{UserID: "user-1", Name: "Office"})
	repo.Create(&domain.Favorite{UserID: "user-2", Name: "Other"})

	results, err := repo.FindByUserID("user-1")
	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}
	if len(results) != 2 {
		t.Errorf("Expected 2 favorites for user-1, got %d", len(results))
	}
}

func TestFavoriteFindByUserID_EmptyResult(t *testing.T) {
	repo := repository.NewInMemoryFavoriteRepository()

	results, err := repo.FindByUserID("user-1")
	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}
	if len(results) != 0 {
		t.Errorf("Expected 0 favorites, got %d", len(results))
	}
}

func TestFavoriteFindByUserID_IsolatedBetweenUsers(t *testing.T) {
	repo := repository.NewInMemoryFavoriteRepository()

	repo.Create(&domain.Favorite{UserID: "user-1", Name: "Home"})

	results, err := repo.FindByUserID("user-2")
	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}
	if len(results) != 0 {
		t.Errorf("Expected 0 favorites for user-2, got %d", len(results))
	}
}

func TestFavoriteDelete_Success(t *testing.T) {
	repo := repository.NewInMemoryFavoriteRepository()

	fav := &domain.Favorite{UserID: "user-1", Name: "Home"}
	repo.Create(fav)

	err := repo.Delete(fav.ID, "user-1")
	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}

	results, _ := repo.FindByUserID("user-1")
	if len(results) != 0 {
		t.Errorf("Expected 0 favorites after deletion, got %d", len(results))
	}
}

func TestFavoriteDelete_NotFound(t *testing.T) {
	repo := repository.NewInMemoryFavoriteRepository()

	err := repo.Delete("nonexistent-id", "user-1")
	if err != domain.ErrFavoriteNotFound {
		t.Errorf("Expected ErrFavoriteNotFound, got %v", err)
	}
}

func TestFavoriteDelete_WrongUser(t *testing.T) {
	repo := repository.NewInMemoryFavoriteRepository()

	fav := &domain.Favorite{UserID: "user-1", Name: "Home"}
	repo.Create(fav)

	err := repo.Delete(fav.ID, "user-2")
	if err != domain.ErrFavoriteNotFound {
		t.Errorf("Expected ErrFavoriteNotFound when wrong user deletes, got %v", err)
	}
}

func TestFavoriteDelete_OnlyRemovesTargetFavorite(t *testing.T) {
	repo := repository.NewInMemoryFavoriteRepository()

	fav1 := &domain.Favorite{UserID: "user-1", Name: "Home"}
	fav2 := &domain.Favorite{UserID: "user-1", Name: "Office"}
	repo.Create(fav1)
	repo.Create(fav2)

	repo.Delete(fav1.ID, "user-1")

	results, _ := repo.FindByUserID("user-1")
	if len(results) != 1 {
		t.Errorf("Expected 1 remaining favorite, got %d", len(results))
	}
	if results[0].Name != "Office" {
		t.Errorf("Expected remaining favorite to be 'Office', got %s", results[0].Name)
	}
}

func TestFavoriteCreate_DuplicateRejected(t *testing.T) {
	repo := repository.NewInMemoryFavoriteRepository()
	userID := "user-dup-test"

	orig := &domain.Favorite{
		UserID:    userID,
		Type:      domain.FavoriteTypeOutdoor,
		Name:      "Home",
		Latitude:  45.0,
		Longitude: -73.0,
	}
	err := repo.Create(orig)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	dup := &domain.Favorite{
		UserID:    userID,
		Type:      domain.FavoriteTypeOutdoor,
		Name:      "Work",
		Latitude:  45.0,
		Longitude: -73.0,
	}
	err = repo.Create(dup)
	if err != domain.ErrFavoriteAlreadyExists {
		t.Errorf("expected ErrFavoriteAlreadyExists for outdoor duplicate, got %v", err)
	}

	indoorOrig := &domain.Favorite{
		UserID:       userID,
		Type:         domain.FavoriteTypeIndoor,
		Name:         "Room1",
		BuildingCode: "H",
		FloorNumber:  5,
		X:            1.23,
		Y:            4.56,
	}
	err = repo.Create(indoorOrig)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	indoorDup := &domain.Favorite{
		UserID:       userID,
		Type:         domain.FavoriteTypeIndoor,
		Name:         "Room1 Again",
		BuildingCode: "H",
		FloorNumber:  5,
		X:            1.23,
		Y:            4.56,
	}
	err = repo.Create(indoorDup)
	if err != domain.ErrFavoriteAlreadyExists {
		t.Errorf("expected ErrFavoriteAlreadyExists for indoor duplicate, got %v", err)
	}

	// Make sure different user can add same location
	otherUser := &domain.Favorite{
		UserID:      "other-user",
		Type:        domain.FavoriteTypeOutdoor,
		Name:        "Other Home",
		Latitude:    45.0,
		Longitude:   -73.0,
	}
	err = repo.Create(otherUser)
	if err != nil {
		t.Errorf("expected no error for different user, got %v", err)
	}
}