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

// SearchHistoryItem stores a single search entry.
type SearchHistoryItem struct {
	SearchID  string    `firestore:"searchId" json:"searchId,omitempty"`
	Query     string    `firestore:"query" json:"query"`
	Locations string    `firestore:"locations" json:"locations"`
	Timestamp time.Time `firestore:"timestamp" json:"timestamp,omitempty"`
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

	return nil
}

// ===== Search History =====

func (fs *FirebaseService) AddSearchHistory(ctx context.Context, userID string, item SearchHistoryItem) (string, error) {
	item.Timestamp = time.Now()
	ref, _, err := fs.client.Collection("users").Doc(userID).Collection("searchHistory").Add(ctx, item)
	if err != nil {
		return "", fmt.Errorf("add search history: %w", err)
	}
	return ref.ID, nil
}

func (fs *FirebaseService) GetSearchHistory(ctx context.Context, userID string, limit int) ([]SearchHistoryItem, error) {
	if limit <= 0 {
		limit = 50
	}

	docs, err := fs.client.Collection("users").Doc(userID).Collection("searchHistory").
		OrderBy("timestamp", firestore.Desc).
		Limit(limit).
		Documents(ctx).GetAll()
	if err != nil {
		return nil, fmt.Errorf("get search history: %w", err)
	}

	history := make([]SearchHistoryItem, 0, len(docs))
	for _, doc := range docs {
		// Skip initialization placeholder
		if doc.Ref.ID == "_init" {
			continue
		}
		var item SearchHistoryItem
		if doc.DataTo(&item) != nil {
			continue
		}
		item.SearchID = doc.Ref.ID
		history = append(history, item)
	}
	return history, nil
}

func (fs *FirebaseService) ClearSearchHistory(ctx context.Context, userID string) error {
	iter := fs.client.Collection("users").Doc(userID).Collection("searchHistory").Documents(ctx)
	batch := fs.client.Batch()
	count := 0

	for {
		doc, err := iter.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			return fmt.Errorf("iterate search history: %w", err)
		}
		batch.Delete(doc.Ref)
		count++
	}

	if count > 0 {
		if _, err := batch.Commit(ctx); err != nil {
			return fmt.Errorf("clear search history: %w", err)
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
