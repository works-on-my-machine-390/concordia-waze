package application_test

import (
	"context"
	"os"
	"sync"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/works-on-my-machine-390/concordia-waze/internal/application"
	"github.com/works-on-my-machine-390/concordia-waze/internal/application/firebase"
	"github.com/works-on-my-machine-390/concordia-waze/internal/domain"
)

// These are integration tests that require a Firestore emulator or real Firebase instance.
// To run these tests:
// 1. Start the Firestore emulator: firebase emulators:start --only firestore
// 2. Set environment variable: FIRESTORE_EMULATOR_HOST=localhost:8080
// 3. Run: go test ./internal/application -v

var (
	initOnce sync.Once
	initErr  error
)

func setupTestService(t *testing.T) *application.FirebaseService {
	// Initialize Firebase once for all tests
	initOnce.Do(func() {
		// Check if we should use the emulator
		if emulatorHost := os.Getenv("FIRESTORE_EMULATOR_HOST"); emulatorHost != "" {
			t.Logf("Using Firestore emulator at %s", emulatorHost)
			// Set project ID for emulator
			if os.Getenv("GCLOUD_PROJECT") == "" {
				os.Setenv("GCLOUD_PROJECT", "demo-test-project")
			}
		} else {
			t.Log("Using real Firebase (make sure serviceAccountKey.json exists)")
		}

		ctx := context.Background()
		initErr = firebase.Initialize(ctx)
	})

	if initErr != nil {
		t.Skipf("Skipping test: Firebase initialization failed: %v", initErr)
	}

	service := application.NewFirebaseService()
	require.NotNil(t, service, "FirebaseService should not be nil")
	return service
}

func TestCreateAndGetUserProfile(t *testing.T) {
	service := setupTestService(t)
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	userID := "test-user-" + time.Now().Format("20060102150405")

	profile := domain.User{
		Email:    "test@example.com",
		Name:     "John Doe",
		Password: "hashedpassword123",
	}

	// Create profile
	err := service.CreateUserProfile(ctx, userID, profile)
	require.NoError(t, err)

	// Get profile
	retrieved, err := service.GetUserProfile(ctx, userID)
	require.NoError(t, err)
	assert.Equal(t, userID, retrieved.ID)
	assert.Equal(t, "test@example.com", retrieved.Email)
	assert.Equal(t, "John Doe", retrieved.Name)
}

func TestGetUserProfileByEmail(t *testing.T) {
	service := setupTestService(t)
	ctx := context.Background()
	userID := "test-user-email-" + time.Now().Format("20060102150405")
	email := "unique-" + time.Now().Format("20060102150405") + "@example.com"

	profile := domain.User{
		Email:    email,
		Name:     "Jane Smith",
		Password: "hashedpassword456",
	}

	// Create profile
	err := service.CreateUserProfile(ctx, userID, profile)
	require.NoError(t, err)

	// Get by email
	retrieved, err := service.GetUserProfileByEmail(ctx, email)
	require.NoError(t, err)
	assert.Equal(t, email, retrieved.Email)
	assert.Equal(t, "Jane Smith", retrieved.Name)
}

func TestAddAndGetSearchHistory(t *testing.T) {
	service := setupTestService(t)
	ctx := context.Background()
	userID := "test-user-search-" + time.Now().Format("20060102150405")

	// Create user first
	profile := domain.User{
		Email:    "search@example.com",
		Name:     "Search User",
		Password: "password",
	}
	err := service.CreateUserProfile(ctx, userID, profile)
	require.NoError(t, err)

	// Add search history
	item := application.SearchHistoryItem{
		Query:     "JMSB",
		Locations: "1455 De Maisonneuve Blvd. W",
	}
	searchID, err := service.AddSearchHistory(ctx, userID, item)
	require.NoError(t, err)
	assert.NotEmpty(t, searchID)

	// Get search history
	history, err := service.GetSearchHistory(ctx, userID, 10)
	require.NoError(t, err)
	assert.GreaterOrEqual(t, len(history), 1)

	found := false
	for _, h := range history {
		if h.Query == "JMSB" {
			found = true
			assert.Equal(t, "1455 De Maisonneuve Blvd. W", h.Locations)
			assert.NotEmpty(t, h.SearchID)
			break
		}
	}
	assert.True(t, found, "Search history item not found")
}

func TestClearSearchHistory(t *testing.T) {
	service := setupTestService(t)
	ctx := context.Background()
	userID := "test-user-clear-" + time.Now().Format("20060102150405")

	// Create user
	profile := domain.User{
		Email:    "clear@example.com",
		Name:     "Clear User",
		Password: "password",
	}
	err := service.CreateUserProfile(ctx, userID, profile)
	require.NoError(t, err)

	// Add multiple items
	for i := 0; i < 3; i++ {
		item := application.SearchHistoryItem{
			Query:     "Query " + string(rune(i)),
			Locations: "Location " + string(rune(i)),
		}
		_, err := service.AddSearchHistory(ctx, userID, item)
		require.NoError(t, err)
	}

	// Clear history
	err = service.ClearSearchHistory(ctx, userID)
	require.NoError(t, err)

	// Verify cleared (only _init doc should remain)
	history, err := service.GetSearchHistory(ctx, userID, 10)
	require.NoError(t, err)
	assert.Equal(t, 0, len(history))
}

func TestAddAndGetSchedule(t *testing.T) {
	service := setupTestService(t)
	ctx := context.Background()
	userID := "test-user-schedule-" + time.Now().Format("20060102150405")

	// Create user
	profile := domain.User{
		Email:    "schedule@example.com",
		Name:     "Schedule User",
		Password: "password",
	}
	err := service.CreateUserProfile(ctx, userID, profile)
	require.NoError(t, err)

	// Add schedule item
	item := application.ScheduleItem{
		Name:       "SOEN 390 Lecture",
		Building:   "Hall Building",
		Room:       "H-929",
		StartTime:  "17:45",
		EndTime:    "20:15",
		DaysOfWeek: []string{"Monday", "Wednesday"},
		Type:       "class",
	}
	scheduleID, err := service.AddScheduleItem(ctx, userID, item)
	require.NoError(t, err)
	assert.NotEmpty(t, scheduleID)

	// Get schedule
	schedule, err := service.GetUserSchedule(ctx, userID)
	require.NoError(t, err)
	assert.GreaterOrEqual(t, len(schedule), 1)

	found := false
	for _, s := range schedule {
		if s.Name == "SOEN 390 Lecture" {
			found = true
			assert.Equal(t, "Hall Building", s.Building)
			assert.Equal(t, "H-929", s.Room)
			assert.Equal(t, "17:45", s.StartTime)
			assert.Equal(t, "20:15", s.EndTime)
			assert.Equal(t, []string{"Monday", "Wednesday"}, s.DaysOfWeek)
			assert.Equal(t, "class", s.Type)
			assert.NotEmpty(t, s.ScheduleID)
			break
		}
	}
	assert.True(t, found, "Schedule item not found")
}

func TestUpdateScheduleItem(t *testing.T) {
	service := setupTestService(t)
	ctx := context.Background()
	userID := "test-user-schedule-update-" + time.Now().Format("20060102150405")

	// Create user
	profile := domain.User{
		Email:    "scheduleupdate@example.com",
		Name:     "Schedule Update",
		Password: "password",
	}
	err := service.CreateUserProfile(ctx, userID, profile)
	require.NoError(t, err)

	// Add schedule item
	item := application.ScheduleItem{
		Name:       "Original Class",
		StartTime:  "10:00",
		EndTime:    "11:30",
		DaysOfWeek: []string{"Tuesday"},
		Type:       "class",
	}
	scheduleID, err := service.AddScheduleItem(ctx, userID, item)
	require.NoError(t, err)

	// Update schedule item
	updates := map[string]interface{}{
		"name":      "Updated Class",
		"startTime": "14:00",
		"endTime":   "15:30",
	}
	err = service.UpdateScheduleItem(ctx, userID, scheduleID, updates)
	require.NoError(t, err)

	// Verify update
	schedule, err := service.GetUserSchedule(ctx, userID)
	require.NoError(t, err)

	found := false
	for _, s := range schedule {
		if s.ScheduleID == scheduleID {
			found = true
			assert.Equal(t, "Updated Class", s.Name)
			assert.Equal(t, "14:00", s.StartTime)
			assert.Equal(t, "15:30", s.EndTime)
			break
		}
	}
	assert.True(t, found, "Updated schedule item not found")
}

func TestDeleteScheduleItem(t *testing.T) {
	service := setupTestService(t)
	ctx := context.Background()
	userID := "test-user-schedule-delete-" + time.Now().Format("20060102150405")

	// Create user
	profile := domain.User{
		Email:    "scheduledelete@example.com",
		Name:     "Schedule Delete",
		Password: "password",
	}
	err := service.CreateUserProfile(ctx, userID, profile)
	require.NoError(t, err)

	// Add schedule item
	item := application.ScheduleItem{
		Name:       "To Be Deleted",
		StartTime:  "10:00",
		EndTime:    "11:00",
		DaysOfWeek: []string{"Friday"},
		Type:       "class",
	}
	scheduleID, err := service.AddScheduleItem(ctx, userID, item)
	require.NoError(t, err)

	// Delete schedule item
	err = service.DeleteScheduleItem(ctx, userID, scheduleID)
	require.NoError(t, err)

	// Verify deletion
	schedule, err := service.GetUserSchedule(ctx, userID)
	require.NoError(t, err)

	for _, s := range schedule {
		assert.NotEqual(t, scheduleID, s.ScheduleID, "Deleted item still exists")
	}
}

func TestAddAndGetSavedAddresses(t *testing.T) {
	service := setupTestService(t)
	ctx := context.Background()
	userID := "test-user-address-" + time.Now().Format("20060102150405")

	// Create user
	profile := domain.User{
		Email:    "address@example.com",
		Name:     "Address User",
		Password: "password",
	}
	err := service.CreateUserProfile(ctx, userID, profile)
	require.NoError(t, err)

	// Add saved address
	address := application.SavedAddress{
		Address: "1455 De Maisonneuve Blvd. W, Montreal",
	}
	addressID, err := service.AddSavedAddress(ctx, userID, address)
	require.NoError(t, err)
	assert.NotEmpty(t, addressID)

	// Get saved addresses
	addresses, err := service.GetSavedAddresses(ctx, userID)
	require.NoError(t, err)
	assert.GreaterOrEqual(t, len(addresses), 1)

	found := false
	for _, a := range addresses {
		if a.Address == "1455 De Maisonneuve Blvd. W, Montreal" {
			found = true
			assert.NotEmpty(t, a.AddressID)
			break
		}
	}
	assert.True(t, found, "Saved address not found")
}

func TestUpdateSavedAddress(t *testing.T) {
	service := setupTestService(t)
	ctx := context.Background()
	userID := "test-user-address-update-" + time.Now().Format("20060102150405")

	// Create user
	profile := domain.User{
		Email:    "addressupdate@example.com",
		Name:     "Address Update",
		Password: "password",
	}
	err := service.CreateUserProfile(ctx, userID, profile)
	require.NoError(t, err)

	// Add saved address
	address := application.SavedAddress{
		Address: "Original Address",
	}
	addressID, err := service.AddSavedAddress(ctx, userID, address)
	require.NoError(t, err)

	// Update address
	updates := map[string]interface{}{
		"address": "Updated Address",
	}
	err = service.UpdateSavedAddress(ctx, userID, addressID, updates)
	require.NoError(t, err)

	// Verify update
	addresses, err := service.GetSavedAddresses(ctx, userID)
	require.NoError(t, err)

	found := false
	for _, a := range addresses {
		if a.AddressID == addressID {
			found = true
			assert.Equal(t, "Updated Address", a.Address)
			break
		}
	}
	assert.True(t, found, "Updated address not found")
}

func TestDeleteSavedAddress(t *testing.T) {
	service := setupTestService(t)
	ctx := context.Background()
	userID := "test-user-address-delete-" + time.Now().Format("20060102150405")

	// Create user
	profile := domain.User{
		Email:    "addressdelete@example.com",
		Name:     "Address Saved",
		Password: "password",
	}
	err := service.CreateUserProfile(ctx, userID, profile)
	require.NoError(t, err)

	// Add saved address
	address := application.SavedAddress{
		Address: "To Be Deleted",
	}
	addressID, err := service.AddSavedAddress(ctx, userID, address)
	require.NoError(t, err)

	// Delete address
	err = service.DeleteSavedAddress(ctx, userID, addressID)
	require.NoError(t, err)

	// Verify deletion
	addresses, err := service.GetSavedAddresses(ctx, userID)
	require.NoError(t, err)

	for _, a := range addresses {
		assert.NotEqual(t, addressID, a.AddressID, "Deleted address still exists")
	}
}

func TestSubcollectionsInitialized(t *testing.T) {
	service := setupTestService(t)
	ctx := context.Background()
	userID := "test-user-subcoll-" + time.Now().Format("20060102150405")

	// Create user (should initialize subcollections)
	profile := domain.User{
		Email:    "subcoll@example.com",
		Name:     "Subcollection Init",
		Password: "password",
	}
	err := service.CreateUserProfile(ctx, userID, profile)
	require.NoError(t, err)

	// Verify subcollections exist by querying them
	// Search history should be initialized
	history, err := service.GetSearchHistory(ctx, userID, 10)
	require.NoError(t, err)
	assert.NotNil(t, history)

	// Schedule should be initialized
	schedule, err := service.GetUserSchedule(ctx, userID)
	require.NoError(t, err)
	assert.NotNil(t, schedule)

	// Saved addresses should be initialized
	addresses, err := service.GetSavedAddresses(ctx, userID)
	require.NoError(t, err)
	assert.NotNil(t, addresses)
}

func TestGetUserProfileByEmailNotFound(t *testing.T) {
	service := setupTestService(t)
	ctx := context.Background()

	// Try to get non-existent user
	_, err := service.GetUserProfileByEmail(ctx, "nonexistent-"+time.Now().Format("20060102150405")+"@example.com")
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "user not found")
}

func TestGetSearchHistoryWithZeroLimit(t *testing.T) {
	service := setupTestService(t)
	ctx := context.Background()
	userID := "test-user-limit-" + time.Now().Format("20060102150405")

	// Create user
	profile := domain.User{
		Email:    "limituser@example.com",
		Name:     "Limit Zero",
		Password: "password",
	}
	err := service.CreateUserProfile(ctx, userID, profile)
	require.NoError(t, err)

	// Add multiple items
	for i := 0; i < 5; i++ {
		item := application.SearchHistoryItem{
			Query:     "Test Query",
			Locations: "Location",
		}
		_, err := service.AddSearchHistory(ctx, userID, item)
		require.NoError(t, err)
	}

	// Get with limit 0 (should default to 50)
	history, err := service.GetSearchHistory(ctx, userID, 0)
	require.NoError(t, err)
	assert.GreaterOrEqual(t, len(history), 5)
}

func TestGetSearchHistoryWithNegativeLimit(t *testing.T) {
	service := setupTestService(t)
	ctx := context.Background()
	userID := "test-user-neg-" + time.Now().Format("20060102150405")

	// Create user
	profile := domain.User{
		Email:    "neguser@example.com",
		Name:     "Negative Limit",
		Password: "password",
	}
	err := service.CreateUserProfile(ctx, userID, profile)
	require.NoError(t, err)

	// Add items
	for i := 0; i < 3; i++ {
		item := application.SearchHistoryItem{
			Query:     "Query",
			Locations: "Loc",
		}
		_, err := service.AddSearchHistory(ctx, userID, item)
		require.NoError(t, err)
	}

	// Get with negative limit (should default to 50)
	history, err := service.GetSearchHistory(ctx, userID, -10)
	require.NoError(t, err)
	assert.GreaterOrEqual(t, len(history), 3)
}

func TestGetSearchHistoryWithSmallLimit(t *testing.T) {
	service := setupTestService(t)
	ctx := context.Background()
	userID := "test-user-small-" + time.Now().Format("20060102150405")

	// Create user
	profile := domain.User{
		Email:    "smalluser@example.com",
		Name:     "Small User",
		Password: "password",
	}
	err := service.CreateUserProfile(ctx, userID, profile)
	require.NoError(t, err)

	// Add multiple items
	for i := 0; i < 10; i++ {
		item := application.SearchHistoryItem{
			Query:     "Query",
			Locations: "Location",
		}
		_, err := service.AddSearchHistory(ctx, userID, item)
		require.NoError(t, err)
	}

	// Get with limit 3
	history, err := service.GetSearchHistory(ctx, userID, 3)
	require.NoError(t, err)
	assert.LessOrEqual(t, len(history), 3)
}

func TestClearSearchHistoryEmptyHistory(t *testing.T) {
	service := setupTestService(t)
	ctx := context.Background()
	userID := "test-user-empty-clear-" + time.Now().Format("20060102150405")

	// Create user
	profile := domain.User{
		Email:    "emptyclear@example.com",
		Name:     "Empty Clear",
		Password: "password",
	}
	err := service.CreateUserProfile(ctx, userID, profile)
	require.NoError(t, err)

	// Clear history (should not fail on empty collection)
	err = service.ClearSearchHistory(ctx, userID)
	require.NoError(t, err)
}

func TestGetUserScheduleEmptySchedule(t *testing.T) {
	service := setupTestService(t)
	ctx := context.Background()
	userID := "test-user-empty-schedule-" + time.Now().Format("20060102150405")

	// Create user
	profile := domain.User{
		Email:    "emptyschedule@example.com",
		Name:     "Empty Schedule",
		Password: "password",
	}
	err := service.CreateUserProfile(ctx, userID, profile)
	require.NoError(t, err)

	// Get empty schedule
	schedule, err := service.GetUserSchedule(ctx, userID)
	require.NoError(t, err)
	assert.NotNil(t, schedule)
	assert.Equal(t, 0, len(schedule))
}

func TestGetSavedAddressesEmptyAddresses(t *testing.T) {
	service := setupTestService(t)
	ctx := context.Background()
	userID := "test-user-empty-addr-" + time.Now().Format("20060102150405")

	// Create user
	profile := domain.User{
		Email:    "emptyaddr@example.com",
		Name:     "Empty Address",
		Password: "password",
	}
	err := service.CreateUserProfile(ctx, userID, profile)
	require.NoError(t, err)

	// Get empty addresses
	addresses, err := service.GetSavedAddresses(ctx, userID)
	require.NoError(t, err)
	assert.NotNil(t, addresses)
	assert.Equal(t, 0, len(addresses))
}

func TestAddScheduleItemWithOptionalFields(t *testing.T) {
	service := setupTestService(t)
	ctx := context.Background()
	userID := "test-user-opt-" + time.Now().Format("20060102150405")

	// Create user
	profile := domain.User{
		Email:    "optfields@example.com",
		Name:     "Optional Fields",
		Password: "password",
	}
	err := service.CreateUserProfile(ctx, userID, profile)
	require.NoError(t, err)

	// Add schedule item without optional fields
	item := application.ScheduleItem{
		Name:       "Meeting",
		StartTime:  "10:00",
		EndTime:    "11:00",
		DaysOfWeek: []string{"Monday"},
		Type:       "work",
	}
	scheduleID, err := service.AddScheduleItem(ctx, userID, item)
	require.NoError(t, err)
	assert.NotEmpty(t, scheduleID)

	// Verify it was added
	schedule, err := service.GetUserSchedule(ctx, userID)
	require.NoError(t, err)
	assert.GreaterOrEqual(t, len(schedule), 1)

	found := false
	for _, s := range schedule {
		if s.ScheduleID == scheduleID {
			found = true
			assert.Equal(t, "Meeting", s.Name)
			assert.Empty(t, s.Building)
			assert.Empty(t, s.Room)
			break
		}
	}
	assert.True(t, found)
}

func TestUpdateScheduleItemMultipleFields(t *testing.T) {
	service := setupTestService(t)
	ctx := context.Background()
	userID := "test-user-multi-" + time.Now().Format("20060102150405")

	// Create user
	profile := domain.User{
		Email:    "multiupdate@example.com",
		Name:     "Multi Update",
		Password: "password",
	}
	err := service.CreateUserProfile(ctx, userID, profile)
	require.NoError(t, err)

	// Add schedule item
	item := application.ScheduleItem{
		Name:       "Class",
		StartTime:  "10:00",
		EndTime:    "11:00",
		DaysOfWeek: []string{"Monday"},
		Type:       "class",
	}
	scheduleID, err := service.AddScheduleItem(ctx, userID, item)
	require.NoError(t, err)

	// Update multiple fields
	updates := map[string]interface{}{
		"name":       "Updated Class",
		"building":   "EV Building",
		"room":       "EV-001",
		"daysOfWeek": []string{"Monday", "Wednesday", "Friday"},
	}
	err = service.UpdateScheduleItem(ctx, userID, scheduleID, updates)
	require.NoError(t, err)

	// Verify all updates
	schedule, err := service.GetUserSchedule(ctx, userID)
	require.NoError(t, err)

	found := false
	for _, s := range schedule {
		if s.ScheduleID == scheduleID {
			found = true
			assert.Equal(t, "Updated Class", s.Name)
			assert.Equal(t, "EV Building", s.Building)
			assert.Equal(t, "EV-001", s.Room)
			assert.Equal(t, []string{"Monday", "Wednesday", "Friday"}, s.DaysOfWeek)
			break
		}
	}
	assert.True(t, found)
}

func TestAddMultipleSearchHistoryItems(t *testing.T) {
	service := setupTestService(t)
	ctx := context.Background()
	userID := "test-user-multiple-" + time.Now().Format("20060102150405")

	// Create user
	profile := domain.User{
		Email:    "multiple@example.com",
		Name:     "Multiple Items",
		Password: "password",
	}
	err := service.CreateUserProfile(ctx, userID, profile)
	require.NoError(t, err)

	// Add multiple search history items
	queries := []string{"Hall Building", "JMSB", "Library", "EV Building", "Gym"}
	for _, q := range queries {
		item := application.SearchHistoryItem{
			Query:     q,
			Locations: "Location for " + q,
		}
		_, err := service.AddSearchHistory(ctx, userID, item)
		require.NoError(t, err)
		time.Sleep(10 * time.Millisecond) // Ensure different timestamps
	}

	// Get all search history
	history, err := service.GetSearchHistory(ctx, userID, 10)
	require.NoError(t, err)
	assert.GreaterOrEqual(t, len(history), 5)

	// Verify items are ordered by timestamp (latest first)
	if len(history) >= 2 {
		assert.True(t, !history[0].Timestamp.Before(history[1].Timestamp),
			"Search history should be ordered by timestamp desc")
	}
}

func TestAddMultipleSavedAddresses(t *testing.T) {
	service := setupTestService(t)
	ctx := context.Background()
	userID := "test-user-multi-addr-" + time.Now().Format("20060102150405")

	// Create user
	profile := domain.User{
		Email:    "multiaddr@example.com",
		Name:     "Multi Address",
		Password: "password",
	}
	err := service.CreateUserProfile(ctx, userID, profile)
	require.NoError(t, err)

	// Add multiple addresses
	addresses := []string{"Home", "Work", "Gym", "Library"}
	for _, addr := range addresses {
		address := application.SavedAddress{
			Address: addr,
		}
		_, err := service.AddSavedAddress(ctx, userID, address)
		require.NoError(t, err)
	}

	// Get all addresses
	savedAddresses, err := service.GetSavedAddresses(ctx, userID)
	require.NoError(t, err)
	assert.GreaterOrEqual(t, len(savedAddresses), 4)
}
