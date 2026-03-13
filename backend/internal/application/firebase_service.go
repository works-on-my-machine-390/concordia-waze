package application

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"time"

	"cloud.google.com/go/firestore"
	"github.com/google/uuid"
	"github.com/works-on-my-machine-390/concordia-waze/internal/application/firebase"
	"github.com/works-on-my-machine-390/concordia-waze/internal/domain"
	"github.com/works-on-my-machine-390/concordia-waze/internal/persistence/repository"
	"golang.org/x/oauth2"
	"google.golang.org/api/iterator"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
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

// SavedAddress stores a favorite place.
type SavedAddress struct {
	AddressID string `firestore:"addressId" json:"addressId,omitempty"`
	Address   string `firestore:"address" json:"address"`
}

// used to store a Google oauth2.Token.
type googleTokenDoc struct {
	TokenJSON string    `firestore:"tokenJSON"`
	UpdatedAt time.Time `firestore:"updatedAt"`
}

// FirestoreFavorite is the Firestore-stored representation of a saved favorite location.
// The Type field discriminates between "outdoor" and "indoor" favorites.
// Existing documents without a Type field are treated as outdoor on read (backward compat).
type FirestoreFavorite struct {
	ID           string  `firestore:"id"`
	Type         string  `firestore:"type"`
	Name         string  `firestore:"name"`
	Latitude     float64 `firestore:"latitude"`
	Longitude    float64 `firestore:"longitude"`
	BuildingCode string  `firestore:"buildingCode"`
	FloorNumber  int     `firestore:"floorNumber"`
	X            float64 `firestore:"x"`
	Y            float64 `firestore:"y"`
	PoiType      string  `firestore:"poiType"`
}

// ===== User Profile =====

func (fs *FirebaseService) CreateUserProfile(ctx context.Context, userID string, profile domain.User) error {
	profile.ID = userID

	_, err := fs.client.Collection("users").Doc(userID).Set(ctx, profile)
	if err != nil {
		return fmt.Errorf("create user profile: %w", err)
	}

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
	_, err := fs.client.Collection("users").Doc(userID).Collection("searchHistory").Doc("_init").Set(ctx, map[string]interface{}{
		"initialized": true,
		"createdAt":   time.Now(),
	})
	if err != nil {
		return fmt.Errorf("init searchHistory: %w", err)
	}

	_, err = fs.client.Collection("users").Doc(userID).Collection("classes").Doc("_init").Set(ctx, map[string]interface{}{
		"initialized": true,
		"createdAt":   time.Now(),
	})
	if err != nil {
		return fmt.Errorf("init classes: %w", err)
	}

	_, err = fs.client.Collection("users").Doc(userID).Collection("savedAddresses").Doc("_init").Set(ctx, map[string]interface{}{
		"initialized": true,
		"createdAt":   time.Now(),
	})
	if err != nil {
		return fmt.Errorf("init savedAddresses: %w", err)
	}

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

// ===== Classes =====

// CreateClass creates an empty class document under users/{userId}/classes/{title}.
// The class document is only used as a container for the classItems subcollection.
func (fs *FirebaseService) CreateClass(ctx context.Context, userID, title string) error {
	_, err := fs.client.
		Collection("users").
		Doc(userID).
		Collection("classes").
		Doc(title).
		Set(ctx, map[string]interface{}{})
	if err != nil {
		return fmt.Errorf("create class: %w", err)
	}

	return nil
}

// GetUserClasses returns the class titles under users/{userId}/classes.
func (fs *FirebaseService) GetUserClasses(ctx context.Context, userID string) ([]string, error) {
	docs, err := fs.client.
		Collection("users").
		Doc(userID).
		Collection("classes").
		Documents(ctx).
		GetAll()
	if err != nil {
		return nil, fmt.Errorf("get user classes: %w", err)
	}

	classes := make([]string, 0, len(docs))
	for _, doc := range docs {
		if doc.Ref.ID == "_init" {
			continue
		}
		classes = append(classes, doc.Ref.ID)
	}

	return classes, nil
}

// DeleteClass deletes a class and all its schedule items stored in the classItems subcollection.
func (fs *FirebaseService) DeleteClass(ctx context.Context, userID, title string) error {
	itemDocs, err := fs.client.
		Collection("users").
		Doc(userID).
		Collection("classes").
		Doc(title).
		Collection("classItems").
		Documents(ctx).
		GetAll()
	if err != nil {
		return fmt.Errorf("get class items for delete: %w", err)
	}

	batch := fs.client.Batch()
	for _, doc := range itemDocs {
		batch.Delete(doc.Ref)
	}

	classRef := fs.client.
		Collection("users").
		Doc(userID).
		Collection("classes").
		Doc(title)
	batch.Delete(classRef)

	if _, err := batch.Commit(ctx); err != nil {
		return fmt.Errorf("delete class: %w", err)
	}

	return nil
}

// ===== Class Items =====

func (fs *FirebaseService) AddClassItem(ctx context.Context, userID, title string, item domain.ClassItem) (string, error) {
	ref, _, err := fs.client.
		Collection("users").
		Doc(userID).
		Collection("classes").
		Doc(title).
		Collection("classItems").
		Add(ctx, item)
	if err != nil {
		return "", fmt.Errorf("add class item: %w", err)
	}

	return ref.ID, nil
}

func (fs *FirebaseService) GetClassItems(ctx context.Context, userID, title string) ([]domain.ClassItem, error) {
	docs, err := fs.client.
		Collection("users").
		Doc(userID).
		Collection("classes").
		Doc(title).
		Collection("classItems").
		OrderBy("day", firestore.Asc).
		OrderBy("startTime", firestore.Asc).
		Documents(ctx).
		GetAll()
	if err != nil {
		return nil, fmt.Errorf("get class items: %w", err)
	}

	items := make([]domain.ClassItem, 0, len(docs))
	for _, doc := range docs {
		var item domain.ClassItem
		if doc.DataTo(&item) != nil {
			continue
		}

		item.ClassID = doc.Ref.ID
		items = append(items, item)
	}

	return items, nil
}

func (fs *FirebaseService) UpdateClassItem(ctx context.Context, userID, title, classID string, updates map[string]interface{}) error {
	_, err := fs.client.
		Collection("users").
		Doc(userID).
		Collection("classes").
		Doc(title).
		Collection("classItems").
		Doc(classID).
		Update(ctx, toFirestoreUpdates(updates))
	if err != nil {
		return fmt.Errorf("update class item: %w", err)
	}

	return nil
}

func (fs *FirebaseService) DeleteClassItem(ctx context.Context, userID, title, classID string) error {
	_, err := fs.client.
		Collection("users").
		Doc(userID).
		Collection("classes").
		Doc(title).
		Collection("classItems").
		Doc(classID).
		Delete(ctx)
	if err != nil {
		return fmt.Errorf("delete class item: %w", err)
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

func (fs *FirebaseService) SaveGoogleToken(ctx context.Context, userID string, token *oauth2.Token) error {
	if token == nil {
		return fmt.Errorf("token is nil")
	}

	b, err := json.Marshal(token)
	if err != nil {
		return fmt.Errorf("marshal token: %w", err)
	}

	doc := googleTokenDoc{
		TokenJSON: string(b),
		UpdatedAt: time.Now().UTC(),
	}

	_, err = fs.client.Collection("users").Doc(userID).Collection("tokens").Doc("google").Set(ctx, doc)
	if err != nil {
		return fmt.Errorf("save google token: %w", err)
	}
	return nil
}

func (fs *FirebaseService) GetGoogleToken(ctx context.Context, userID string) (*oauth2.Token, bool, error) {
	docRef := fs.client.Collection("users").Doc(userID).Collection("tokens").Doc("google")
	ds, err := docRef.Get(ctx)
	if err != nil {
		if status.Code(err) == codes.NotFound {
			return nil, false, nil
		}
		return nil, false, fmt.Errorf("get google token doc: %w", err)
	}

	var td googleTokenDoc
	if err := ds.DataTo(&td); err != nil {
		return nil, false, fmt.Errorf("parse google token doc: %w", err)
	}

	var tok oauth2.Token
	if err := json.Unmarshal([]byte(td.TokenJSON), &tok); err != nil {
		return nil, false, fmt.Errorf("unmarshal token json: %w", err)
	}
	return &tok, true, nil
}

func (fs *FirebaseService) DeleteGoogleToken(ctx context.Context, userID string) error {
	_, err := fs.client.Collection("users").Doc(userID).Collection("tokens").Doc("google").Delete(ctx)
	if err != nil {
		return fmt.Errorf("delete google token: %w", err)
	}
	return nil
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
		ID:           fav.ID,
		Type:         string(fav.Type),
		Name:         fav.Name,
		Latitude:     fav.Latitude,
		Longitude:    fav.Longitude,
		BuildingCode: fav.BuildingCode,
		FloorNumber:  fav.FloorNumber,
		X:            fav.X,
		Y:            fav.Y,
		PoiType:      fav.PoiType,
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
		// Backward compat: documents written before the type field was added have an
		// empty type string; treat them as outdoor favorites.
		favType := domain.FavoriteType(item.Type)
		if favType == "" {
			favType = domain.FavoriteTypeOutdoor
		}
		result = append(result, &domain.Favorite{
			ID:           item.ID,
			UserID:       userID,
			Type:         favType,
			Name:         item.Name,
			Latitude:     item.Latitude,
			Longitude:    item.Longitude,
			BuildingCode: item.BuildingCode,
			FloorNumber:  item.FloorNumber,
			X:            item.X,
			Y:            item.Y,
			PoiType:      item.PoiType,
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
