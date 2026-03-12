package application

import (
	"context"
	"fmt"
	"log"
	"time"

	"cloud.google.com/go/firestore"
	"github.com/google/uuid"
	"github.com/works-on-my-machine-390/concordia-waze/internal/application/firebase"
	"github.com/works-on-my-machine-390/concordia-waze/internal/domain"
	"github.com/works-on-my-machine-390/concordia-waze/internal/persistence/repository"
	"google.golang.org/api/iterator"
)

// FirebaseService handles Firestore operations.
type FirebaseService struct {
	client *firestore.Client
}

// NewFirebaseService creates a new Firebase service.
func NewFirebaseService() *FirebaseService {
	return &FirebaseService{
		client: firebase.GetClient(),
	}
}

// DestinationHistoryItem stores a past destination entry.
type DestinationHistoryItem struct {
	HistoryID       string    `firestore:"historyId" json:"historyId,omitempty"`
	Name            string    `firestore:"name" json:"name"`
	Address         string    `firestore:"address" json:"address"`
	PlaceID         string    `firestore:"placeId,omitempty" json:"placeId,omitempty"`
	Lat             float64   `firestore:"lat,omitempty" json:"lat,omitempty"`
	Lng             float64   `firestore:"lng,omitempty" json:"lng,omitempty"`
	BuildingCode    string    `firestore:"buildingCode,omitempty" json:"buildingCode,omitempty"`
	DestinationType string    `firestore:"destinationType,omitempty" json:"destinationType,omitempty"` // "building" or "poi"
	Timestamp       time.Time `firestore:"timestamp" json:"timestamp,omitempty"`
}

// ScheduleItem stores a schedule entry.
type ScheduleItem struct {
	ScheduleID string   `firestore:"scheduleId" json:"scheduleId,omitempty"`
	Name       string   `firestore:"name" json:"name"`
	Building   string   `firestore:"building,omitempty" json:"building,omitempty"`
	Room       string   `firestore:"room,omitempty" json:"room,omitempty"`
	StartTime  string   `firestore:"startTime" json:"startTime"`
	EndTime    string   `firestore:"endTime" json:"endTime"`
	DaysOfWeek []string `firestore:"daysOfWeek" json:"daysOfWeek"`
	Type       string   `firestore:"type" json:"type"`
}

// SavedAddress stores a favorite place.
type SavedAddress struct {
	AddressID string `firestore:"addressId" json:"addressId,omitempty"`
	Address   string `firestore:"address" json:"address"`
}

// FirestoreFavorite is the Firestore-stored representation of a saved favorite location.
type FirestoreFavorite struct {
	ID        string  `firestore:"id"`
	Name      string  `firestore:"name"`
	Latitude  float64 `firestore:"latitude"`
	Longitude float64 `firestore:"longitude"`
}

// ===== User Profile =====

func (fs *FirebaseService) CreateUserProfile(ctx context.Context, userID string, profile domain.User) error {
	profile.ID = userID

	_, err := fs.client.Collection("users").Doc(userID).Set(ctx, profile)
	if err != nil {
		return fmt.Errorf("create user profile: %w", err)
	}

	// Initialize subcollections by creating a placeholder document
	if err := fs.initializeSubcollections(ctx, userID); err != nil {
		return fmt.Errorf("initialize subcollections: %w", err)
	}

	return nil
}

func (fs *FirebaseService) GetUserProfile(ctx context.Context, userID string) (*domain.User, error) {
	doc, err := fs.client.Collection("users").Doc(userID).Get(ctx)
	if err != nil {
		return nil, fmt.Errorf("get user profile: %w", err)
	}

	var profile domain.User
	if err := doc.DataTo(&profile); err != nil {
		return nil, fmt.Errorf("parse user profile: %w", err)
	}
	return &profile, nil
}

func (fs *FirebaseService) GetUserProfileByEmail(ctx context.Context, email string) (*domain.User, error) {
	iter := fs.client.Collection("users").Where("Email", "==", email).Limit(1).Documents(ctx)
	defer iter.Stop()

	doc, err := iter.Next()
	if err == iterator.Done {
		return nil, fmt.Errorf("user not found")
	}
	if err != nil {
		return nil, fmt.Errorf("query user by email: %w", err)
	}

	var profile domain.User
	if err := doc.DataTo(&profile); err != nil {
		return nil, fmt.Errorf("parse user profile: %w", err)
	}
	return &profile, nil
}

func (fs *FirebaseService) initializeSubcollections(ctx context.Context, userID string) error {
	// Initialize searchHistory subcollection with a placeholder doc
	_, err := fs.client.Collection("users").Doc(userID).Collection("searchHistory").Doc("_init").Set(ctx, map[string]interface{}{
		"initialized": true,
		"createdAt":   time.Now(),
	})
	if err != nil {
		return fmt.Errorf("init searchHistory: %w", err)
	}

	// Initialize schedule subcollection
	_, err = fs.client.Collection("users").Doc(userID).Collection("schedule").Doc("_init").Set(ctx, map[string]interface{}{
		"initialized": true,
		"createdAt":   time.Now(),
	})
	if err != nil {
		return fmt.Errorf("init schedule: %w", err)
	}

	// Initialize savedAddresses subcollection
	_, err = fs.client.Collection("users").Doc(userID).Collection("savedAddresses").Doc("_init").Set(ctx, map[string]interface{}{
		"initialized": true,
		"createdAt":   time.Now(),
	})
	if err != nil {
		return fmt.Errorf("init savedAddresses: %w", err)
	}

	// Initialize history subcollection
	_, err = fs.client.Collection("users").Doc(userID).
		Collection("history").Doc("_init").
		Set(ctx, map[string]interface{}{
			"initialized": true,
			"createdAt":   time.Now(),
		})
	if err != nil {
		return fmt.Errorf("init history: %w", err)
	}

	// Initialize favorites subcollection
	_, err = fs.client.Collection("users").Doc(userID).Collection("favorites").Doc("_init").Set(ctx, map[string]interface{}{
		"initialized": true,
		"createdAt":   time.Now(),
	})
	if err != nil {
		return fmt.Errorf("init favorites: %w", err)
	}

	return nil
}

// ===== Destination History =====

func (fs *FirebaseService) AddDestinationHistory(ctx context.Context, userID string, item DestinationHistoryItem) (string, error) {
	item.Timestamp = time.Now()
	ref, _, err := fs.client.Collection("users").Doc(userID).Collection("history").Add(ctx, item)
	if err != nil {
		return "", fmt.Errorf("add destination history: %w", err)
	}
	return ref.ID, nil
}

func (fs *FirebaseService) GetDestinationHistory(ctx context.Context, userID string, limit int) ([]DestinationHistoryItem, error) {
	if limit <= 0 {
		limit = 50
	}

	docs, err := fs.client.Collection("users").Doc(userID).Collection("history").
		OrderBy("timestamp", firestore.Desc).
		Limit(limit).
		Documents(ctx).GetAll()
	if err != nil {
		return nil, fmt.Errorf("get destination history: %w", err)
	}

	history := make([]DestinationHistoryItem, 0, len(docs))
	for _, doc := range docs {
		if doc.Ref.ID == "_init" {
			continue
		}
		var item DestinationHistoryItem
		if doc.DataTo(&item) != nil {
			continue
		}
		item.HistoryID = doc.Ref.ID
		history = append(history, item)
	}
	return history, nil
}

func (fs *FirebaseService) ClearDestinationHistory(ctx context.Context, userID string) error {
	iter := fs.client.Collection("users").Doc(userID).Collection("history").Documents(ctx)
	batch := fs.client.Batch()
	count := 0

	for {
		doc, err := iter.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			return fmt.Errorf("iterate destination history: %w", err)
		}
		// Keep placeholder doc
		if doc.Ref.ID == "_init" {
			continue
		}
		batch.Delete(doc.Ref)
		count++
	}

	if count > 0 {
		if _, err := batch.Commit(ctx); err != nil {
			return fmt.Errorf("clear destination history: %w", err)
		}
	}

	return nil
}

// ===== Schedule =====

func (fs *FirebaseService) AddScheduleItem(ctx context.Context, userID string, item ScheduleItem) (string, error) {
	ref, _, err := fs.client.Collection("users").Doc(userID).Collection("schedule").Add(ctx, item)
	if err != nil {
		return "", fmt.Errorf("add schedule item: %w", err)
	}
	return ref.ID, nil
}

func (fs *FirebaseService) GetUserSchedule(ctx context.Context, userID string) ([]ScheduleItem, error) {
	docs, err := fs.client.Collection("users").Doc(userID).Collection("schedule").
		OrderBy("startTime", firestore.Asc).
		Documents(ctx).GetAll()
	if err != nil {
		return nil, fmt.Errorf("get schedule: %w", err)
	}

	schedule := make([]ScheduleItem, 0, len(docs))
	for _, doc := range docs {
		// Skip initialization placeholder
		if doc.Ref.ID == "_init" {
			continue
		}
		var item ScheduleItem
		if doc.DataTo(&item) != nil {
			continue
		}
		item.ScheduleID = doc.Ref.ID
		schedule = append(schedule, item)
	}
	return schedule, nil
}

func (fs *FirebaseService) UpdateScheduleItem(ctx context.Context, userID, scheduleID string, updates map[string]interface{}) error {
	_, err := fs.client.Collection("users").Doc(userID).Collection("schedule").Doc(scheduleID).
		Update(ctx, toFirestoreUpdates(updates))
	if err != nil {
		return fmt.Errorf("update schedule item: %w", err)
	}
	return nil
}

func (fs *FirebaseService) DeleteScheduleItem(ctx context.Context, userID, scheduleID string) error {
	_, err := fs.client.Collection("users").Doc(userID).Collection("schedule").Doc(scheduleID).
		Delete(ctx)
	if err != nil {
		return fmt.Errorf("delete schedule item: %w", err)
	}
	return nil
}

// ===== Saved Addresses =====

func (fs *FirebaseService) AddSavedAddress(ctx context.Context, userID string, address SavedAddress) (string, error) {
	ref, _, err := fs.client.Collection("users").Doc(userID).Collection("savedAddresses").Add(ctx, address)
	if err != nil {
		return "", fmt.Errorf("add saved address: %w", err)
	}
	return ref.ID, nil
}

func (fs *FirebaseService) GetSavedAddresses(ctx context.Context, userID string) ([]SavedAddress, error) {
	collectionRef := fs.client.Collection("users").Doc(userID).Collection("savedAddresses")

	docs, err := collectionRef.Documents(ctx).GetAll()
	if err != nil {
		return nil, fmt.Errorf("get saved addresses: %w", err)
	}

	addresses := make([]SavedAddress, 0, len(docs))
	for _, doc := range docs {
		// Skip initialization placeholder
		if doc.Ref.ID == "_init" {
			continue
		}
		var address SavedAddress
		if doc.DataTo(&address) != nil {
			continue
		}
		address.AddressID = doc.Ref.ID
		addresses = append(addresses, address)
	}
	return addresses, nil
}

func (fs *FirebaseService) UpdateSavedAddress(ctx context.Context, userID, addressID string, updates map[string]interface{}) error {
	_, err := fs.client.Collection("users").Doc(userID).Collection("savedAddresses").Doc(addressID).
		Update(ctx, toFirestoreUpdates(updates))
	if err != nil {
		return fmt.Errorf("update saved address: %w", err)
	}
	return nil
}

func (fs *FirebaseService) DeleteSavedAddress(ctx context.Context, userID, addressID string) error {
	_, err := fs.client.Collection("users").Doc(userID).Collection("savedAddresses").Doc(addressID).
		Delete(ctx)
	if err != nil {
		return fmt.Errorf("delete saved address: %w", err)
	}
	return nil
}

// ===== Favorites =====

// AddFavorite stores a favorite location under users/{userID}/favorites/{fav.ID}.
func (fs *FirebaseService) AddFavorite(ctx context.Context, userID string, fav FirestoreFavorite) error {
	path := fmt.Sprintf("users/%s/favorites/%s", userID, fav.ID)
	log.Printf("[firestore] writing favorite path=%s name=%q", path, fav.Name)
	_, err := fs.client.Collection("users").Doc(userID).Collection("favorites").Doc(fav.ID).Set(ctx, fav)
	if err != nil {
		log.Printf("[firestore] AddFavorite failed path=%s: %v", path, err)
		return fmt.Errorf("add favorite: %w", err)
	}
	log.Printf("[firestore] AddFavorite success path=%s", path)
	return nil
}

// GetFavorites retrieves all favorite locations for a user.
func (fs *FirebaseService) GetFavorites(ctx context.Context, userID string) ([]FirestoreFavorite, error) {
	collPath := fmt.Sprintf("users/%s/favorites", userID)
	log.Printf("[firestore] reading favorites path=%s", collPath)
	docs, err := fs.client.Collection("users").Doc(userID).Collection("favorites").Documents(ctx).GetAll()
	if err != nil {
		log.Printf("[firestore] GetFavorites failed path=%s: %v", collPath, err)
		return nil, fmt.Errorf("get favorites: %w", err)
	}

	log.Printf("[firestore] GetFavorites path=%s found %d raw docs", collPath, len(docs))
	favorites := make([]FirestoreFavorite, 0, len(docs))
	for _, doc := range docs {
		if doc.Ref.ID == "_init" {
			continue
		}
		var fav FirestoreFavorite
		if err := doc.DataTo(&fav); err != nil {
			log.Printf("[firestore] GetFavorites skipping doc=%s: deserialize error: %v", doc.Ref.ID, err)
			continue
		}
		fav.ID = doc.Ref.ID
		favorites = append(favorites, fav)
	}
	log.Printf("[firestore] GetFavorites path=%s returning %d favorites", collPath, len(favorites))
	return favorites, nil
}

// DeleteFavorite removes a favorite by ID from Firestore, scoped to the owning user.
// Returns ErrFavoriteNotFound if the document does not exist under that user.
func (fs *FirebaseService) DeleteFavorite(ctx context.Context, userID, favoriteID string) error {
	path := fmt.Sprintf("users/%s/favorites/%s", userID, favoriteID)
	log.Printf("[firestore] deleting favorite path=%s", path)
	docRef := fs.client.Collection("users").Doc(userID).Collection("favorites").Doc(favoriteID)
	snap, err := docRef.Get(ctx)
	if err != nil || !snap.Exists() {
		log.Printf("[firestore] DeleteFavorite not found path=%s", path)
		return domain.ErrFavoriteNotFound
	}
	if _, err := docRef.Delete(ctx); err != nil {
		log.Printf("[firestore] DeleteFavorite failed path=%s: %v", path, err)
		return fmt.Errorf("delete favorite: %w", err)
	}
	log.Printf("[firestore] DeleteFavorite success path=%s", path)
	return nil
}

// toFirestoreUpdates converts a map to Firestore updates.
func toFirestoreUpdates(data map[string]interface{}) []firestore.Update {
	updates := make([]firestore.Update, 0, len(data))
	for key, value := range data {
		updates = append(updates, firestore.Update{
			Path:  key,
			Value: value,
		})
	}
	return updates
}

// ===== Favorite repository adapters =====

// FirestoreFavoriteRepository implements repository.FavoriteRepository backed by Firestore.
// Each favorite is stored at users/{userID}/favorites/{favoriteID}.
type FirestoreFavoriteRepository struct {
	service *FirebaseService
}

// NewFirestoreFavoriteRepository creates a new Firestore-backed favorite repository.
func NewFirestoreFavoriteRepository(service *FirebaseService) *FirestoreFavoriteRepository {
	return &FirestoreFavoriteRepository{service: service}
}

func (r *FirestoreFavoriteRepository) Create(fav *domain.Favorite) error {
	if fav.ID == "" {
		fav.ID = uuid.New().String()
	}
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	return r.service.AddFavorite(ctx, fav.UserID, FirestoreFavorite{
		ID:        fav.ID,
		Name:      fav.Name,
		Latitude:  fav.Latitude,
		Longitude: fav.Longitude,
	})
}

func (r *FirestoreFavoriteRepository) FindByUserID(userID string) ([]*domain.Favorite, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	items, err := r.service.GetFavorites(ctx, userID)
	if err != nil {
		return nil, err
	}
	result := make([]*domain.Favorite, 0, len(items))
	for _, item := range items {
		result = append(result, &domain.Favorite{
			ID:        item.ID,
			UserID:    userID,
			Name:      item.Name,
			Latitude:  item.Latitude,
			Longitude: item.Longitude,
		})
	}
	return result, nil
}

func (r *FirestoreFavoriteRepository) Delete(id, userID string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	return r.service.DeleteFavorite(ctx, userID, id)
}

// HybridFavoriteRepository routes authenticated users (non-empty userID) to Firestore
// and anonymous users (empty userID) to the in-memory store.
type HybridFavoriteRepository struct {
	firestoreRepo repository.FavoriteRepository
	memoryRepo    repository.FavoriteRepository
}

// NewHybridFavoriteRepository creates a repository that persists authenticated favorites
// in Firestore and keeps anonymous favorites in memory.
func NewHybridFavoriteRepository(firebaseService *FirebaseService) *HybridFavoriteRepository {
	return &HybridFavoriteRepository{
		firestoreRepo: NewFirestoreFavoriteRepository(firebaseService),
		memoryRepo:    repository.NewInMemoryFavoriteRepository(),
	}
}

func (r *HybridFavoriteRepository) Create(fav *domain.Favorite) error {
	if fav.UserID == "" {
		return r.memoryRepo.Create(fav)
	}
	return r.firestoreRepo.Create(fav)
}

func (r *HybridFavoriteRepository) FindByUserID(userID string) ([]*domain.Favorite, error) {
	if userID == "" {
		return r.memoryRepo.FindByUserID(userID)
	}
	return r.firestoreRepo.FindByUserID(userID)
}

func (r *HybridFavoriteRepository) Delete(id, userID string) error {
	if userID == "" {
		return r.memoryRepo.Delete(id, userID)
	}
	return r.firestoreRepo.Delete(id, userID)
}
