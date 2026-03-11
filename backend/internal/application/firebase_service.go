package application

import (
	"context"
	"fmt"
	"time"

	"cloud.google.com/go/firestore"
	"github.com/works-on-my-machine-390/concordia-waze/internal/application/firebase"
	"github.com/works-on-my-machine-390/concordia-waze/internal/domain"
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

// ClassItem stores one schedule entry under a class.
type ClassItem struct {
	ItemID       string `firestore:"itemId" json:"itemId,omitempty"`
	Type         string `firestore:"type" json:"type"` // lab, lec, tut
	Section      string `firestore:"section" json:"section"`
	Day          string `firestore:"day" json:"day"`
	StartTime    string `firestore:"startTime" json:"startTime"`
	EndTime      string `firestore:"endTime" json:"endTime"`
	BuildingCode string `firestore:"buildingCode,omitempty" json:"buildingCode,omitempty"`
	Room         string `firestore:"room,omitempty" json:"room,omitempty"`
	Origin       string `firestore:"origin,omitempty" json:"origin,omitempty"` // e.g. "manual" or "google"
}

// SavedAddress stores a favorite place.
type SavedAddress struct {
	AddressID string `firestore:"addressId" json:"addressId,omitempty"`
	Address   string `firestore:"address" json:"address"`
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

func (fs *FirebaseService) AddClassItem(ctx context.Context, userID, title string, item ClassItem) (string, error) {
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

func (fs *FirebaseService) GetClassItems(ctx context.Context, userID, title string) ([]ClassItem, error) {
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

	items := make([]ClassItem, 0, len(docs))
	for _, doc := range docs {
		var item ClassItem
		if err := doc.DataTo(&item); err != nil {
			continue
		}

		item.ItemID = doc.Ref.ID
		items = append(items, item)
	}

	return items, nil
}

func (fs *FirebaseService) UpdateClassItem(ctx context.Context, userID, title, itemID string, updates map[string]interface{}) error {
	_, err := fs.client.
		Collection("users").
		Doc(userID).
		Collection("classes").
		Doc(title).
		Collection("classItems").
		Doc(itemID).
		Update(ctx, toFirestoreUpdates(updates))
	if err != nil {
		return fmt.Errorf("update class item: %w", err)
	}

	return nil
}

func (fs *FirebaseService) DeleteClassItem(ctx context.Context, userID, title, itemID string) error {
	_, err := fs.client.
		Collection("users").
		Doc(userID).
		Collection("classes").
		Doc(title).
		Collection("classItems").
		Doc(itemID).
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
