package application_test

import (
	"context"
	"errors"
	"os"
	"strconv"
	"sync"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/works-on-my-machine-390/concordia-waze/internal/application"
	"github.com/works-on-my-machine-390/concordia-waze/internal/application/firebase"
	"github.com/works-on-my-machine-390/concordia-waze/internal/domain"
	"github.com/works-on-my-machine-390/concordia-waze/internal/persistence/repository"
	"golang.org/x/oauth2"
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
	initOnce.Do(func() {
		if emulatorHost := os.Getenv("FIRESTORE_EMULATOR_HOST"); emulatorHost != "" {
			t.Logf("Using Firestore emulator at %s", emulatorHost)
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

	err := service.CreateUserProfile(ctx, userID, profile)
	require.NoError(t, err)

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

	err := service.CreateUserProfile(ctx, userID, profile)
	require.NoError(t, err)

	retrieved, err := service.GetUserProfileByEmail(ctx, email)
	require.NoError(t, err)
	assert.Equal(t, email, retrieved.Email)
	assert.Equal(t, "Jane Smith", retrieved.Name)
}

func TestCreateAndGetUserClasses(t *testing.T) {
	service := setupTestService(t)
	ctx := context.Background()
	userID := "test-user-classes-" + time.Now().Format("20060102150405")

	profile := domain.User{
		Email:    "classes@example.com",
		Name:     "Classes User",
		Password: "password",
	}
	err := service.CreateUserProfile(ctx, userID, profile)
	require.NoError(t, err)

	err = service.CreateClass(ctx, userID, "SOEN345")
	require.NoError(t, err)

	err = service.CreateClass(ctx, userID, "COMP352")
	require.NoError(t, err)

	classes, err := service.GetUserClasses(ctx, userID)
	require.NoError(t, err)
	assert.GreaterOrEqual(t, len(classes), 2)
	assert.Contains(t, classes, "SOEN345")
	assert.Contains(t, classes, "COMP352")
}

func TestDeleteClass(t *testing.T) {
	service := setupTestService(t)
	ctx := context.Background()
	userID := "test-user-delete-class-" + time.Now().Format("20060102150405")
	title := "SOEN390"

	profile := domain.User{
		Email:    "deleteclass@example.com",
		Name:     "Delete Class",
		Password: "password",
	}
	err := service.CreateUserProfile(ctx, userID, profile)
	require.NoError(t, err)

	err = service.CreateClass(ctx, userID, title)
	require.NoError(t, err)

	_, err = service.AddClassItem(ctx, userID, title, domain.ClassItem{
		Type:         "lec",
		Section:      "S",
		Day:          "Monday",
		StartTime:    "09:00",
		EndTime:      "10:15",
		BuildingCode: "H",
		Room:         "H-937",
	})
	require.NoError(t, err)

	err = service.DeleteClass(ctx, userID, title)
	require.NoError(t, err)

	classes, err := service.GetUserClasses(ctx, userID)
	require.NoError(t, err)
	assert.NotContains(t, classes, title)
}

func TestAddAndGetClassItems(t *testing.T) {
	service := setupTestService(t)
	ctx := context.Background()
	userID := "test-user-items-" + time.Now().Format("20060102150405")
	title := "SOEN345"

	profile := domain.User{
		Email:    "sessions@example.com",
		Name:     "Sessions User",
		Password: "password",
	}
	err := service.CreateUserProfile(ctx, userID, profile)
	require.NoError(t, err)

	err = service.CreateClass(ctx, userID, title)
	require.NoError(t, err)

	item := domain.ClassItem{
		Type:         "lec",
		Section:      "S",
		Day:          "Monday",
		StartTime:    "17:45",
		EndTime:      "20:15",
		BuildingCode: "H",
		Room:         "H-929",
	}

	itemID, err := service.AddClassItem(ctx, userID, title, item)
	require.NoError(t, err)
	assert.NotEmpty(t, itemID)

	items, err := service.GetClassItems(ctx, userID, title)
	require.NoError(t, err)
	assert.GreaterOrEqual(t, len(items), 1)

	found := false
	for _, i := range items {
		if i.ClassID == itemID {
			found = true
			assert.Equal(t, "lec", i.Type)
			assert.Equal(t, "S", i.Section)
			assert.Equal(t, "Monday", i.Day)
			assert.Equal(t, "17:45", i.StartTime)
			assert.Equal(t, "20:15", i.EndTime)
			assert.Equal(t, "H", i.BuildingCode)
			assert.Equal(t, "H-929", i.Room)
			break
		}
	}
	assert.True(t, found, "Class item not found")
}

func TestUpdateClassItem(t *testing.T) {
	service := setupTestService(t)
	ctx := context.Background()
	userID := "test-user-item-update-" + time.Now().Format("20060102150405")
	title := "SOEN345"

	profile := domain.User{
		Email:    "sessionupdate@example.com",
		Name:     "Session Update",
		Password: "password",
	}
	err := service.CreateUserProfile(ctx, userID, profile)
	require.NoError(t, err)

	err = service.CreateClass(ctx, userID, title)
	require.NoError(t, err)

	item := domain.ClassItem{
		Type:      "lec",
		Section:   "S",
		Day:       "Tuesday",
		StartTime: "10:00",
		EndTime:   "11:30",
	}
	itemID, err := service.AddClassItem(ctx, userID, title, item)
	require.NoError(t, err)

	updates := map[string]interface{}{
		"type":      "lab",
		"section":   "SL",
		"startTime": "14:00",
		"endTime":   "15:30",
		"room":      "H-833",
	}
	err = service.UpdateClassItem(ctx, userID, title, itemID, updates)
	require.NoError(t, err)

	items, err := service.GetClassItems(ctx, userID, title)
	require.NoError(t, err)

	found := false
	for _, i := range items {
		if i.ClassID == itemID {
			found = true
			assert.Equal(t, "lab", i.Type)
			assert.Equal(t, "SL", i.Section)
			assert.Equal(t, "14:00", i.StartTime)
			assert.Equal(t, "15:30", i.EndTime)
			assert.Equal(t, "H-833", i.Room)
			break
		}
	}
	assert.True(t, found, "Updated class item not found")
}

func TestDeleteClassItem(t *testing.T) {
	service := setupTestService(t)
	ctx := context.Background()
	userID := "test-user-item-delete-" + time.Now().Format("20060102150405")
	title := "SOEN345"

	profile := domain.User{
		Email:    "sessiondelete@example.com",
		Name:     "Session Delete",
		Password: "password",
	}
	err := service.CreateUserProfile(ctx, userID, profile)
	require.NoError(t, err)

	err = service.CreateClass(ctx, userID, title)
	require.NoError(t, err)

	item := domain.ClassItem{
		Type:      "tut",
		Section:   "T",
		Day:       "Friday",
		StartTime: "10:00",
		EndTime:   "11:00",
	}
	itemID, err := service.AddClassItem(ctx, userID, title, item)
	require.NoError(t, err)

	err = service.DeleteClassItem(ctx, userID, title, itemID)
	require.NoError(t, err)

	items, err := service.GetClassItems(ctx, userID, title)
	require.NoError(t, err)

	for _, i := range items {
		assert.NotEqual(t, itemID, i.ClassID, "Deleted item still exists")
	}
}

func TestGetClassItemsEmpty(t *testing.T) {
	service := setupTestService(t)
	ctx := context.Background()
	userID := "test-user-empty-items-" + time.Now().Format("20060102150405")
	title := "COMP352"

	profile := domain.User{
		Email:    "emptysessions@example.com",
		Name:     "Empty Sessions",
		Password: "password",
	}
	err := service.CreateUserProfile(ctx, userID, profile)
	require.NoError(t, err)

	err = service.CreateClass(ctx, userID, title)
	require.NoError(t, err)

	items, err := service.GetClassItems(ctx, userID, title)
	require.NoError(t, err)
	assert.NotNil(t, items)
	assert.Equal(t, 0, len(items))
}

func TestAddClassItemWithOptionalFields(t *testing.T) {
	service := setupTestService(t)
	ctx := context.Background()
	userID := "test-user-opt-item-" + time.Now().Format("20060102150405")
	title := "MATH203"

	profile := domain.User{
		Email:    "optsession@example.com",
		Name:     "Optional Session",
		Password: "password",
	}
	err := service.CreateUserProfile(ctx, userID, profile)
	require.NoError(t, err)

	err = service.CreateClass(ctx, userID, title)
	require.NoError(t, err)

	item := domain.ClassItem{
		Type:      "lec",
		Section:   "A",
		Day:       "Monday",
		StartTime: "10:00",
		EndTime:   "11:00",
	}
	itemID, err := service.AddClassItem(ctx, userID, title, item)
	require.NoError(t, err)
	assert.NotEmpty(t, itemID)

	items, err := service.GetClassItems(ctx, userID, title)
	require.NoError(t, err)

	found := false
	for _, i := range items {
		if i.ClassID == itemID {
			found = true
			assert.Equal(t, "lec", i.Type)
			assert.Equal(t, "A", i.Section)
			assert.Empty(t, i.BuildingCode)
			assert.Empty(t, i.Room)
			break
		}
	}
	assert.True(t, found)
}

func TestUpdateClassItemMultipleFields(t *testing.T) {
	service := setupTestService(t)
	ctx := context.Background()
	userID := "test-user-multi-item-" + time.Now().Format("20060102150405")
	title := "ENGR301"

	profile := domain.User{
		Email:    "multisession@example.com",
		Name:     "Multi Session",
		Password: "password",
	}
	err := service.CreateUserProfile(ctx, userID, profile)
	require.NoError(t, err)

	err = service.CreateClass(ctx, userID, title)
	require.NoError(t, err)

	item := domain.ClassItem{
		Type:      "lec",
		Section:   "B",
		Day:       "Monday",
		StartTime: "10:00",
		EndTime:   "11:00",
	}
	itemID, err := service.AddClassItem(ctx, userID, title, item)
	require.NoError(t, err)

	updates := map[string]interface{}{
		"type":         "tut",
		"section":      "BT",
		"day":          "Wednesday",
		"buildingCode": "EV",
		"room":         "EV-001",
	}
	err = service.UpdateClassItem(ctx, userID, title, itemID, updates)
	require.NoError(t, err)

	items, err := service.GetClassItems(ctx, userID, title)
	require.NoError(t, err)

	found := false
	for _, i := range items {
		if i.ClassID == itemID {
			found = true
			assert.Equal(t, "tut", i.Type)
			assert.Equal(t, "BT", i.Section)
			assert.Equal(t, "Wednesday", i.Day)
			assert.Equal(t, "EV", i.BuildingCode)
			assert.Equal(t, "EV-001", i.Room)
			break
		}
	}
	assert.True(t, found)
}

func TestAddAndGetSavedAddresses(t *testing.T) {
	service := setupTestService(t)
	ctx := context.Background()
	userID := "test-user-address-" + time.Now().Format("20060102150405")

	profile := domain.User{
		Email:    "address@example.com",
		Name:     "Address User",
		Password: "password",
	}
	err := service.CreateUserProfile(ctx, userID, profile)
	require.NoError(t, err)

	address := application.SavedAddress{
		Address: "1455 De Maisonneuve Blvd. W, Montreal",
	}
	addressID, err := service.AddSavedAddress(ctx, userID, address)
	require.NoError(t, err)
	assert.NotEmpty(t, addressID)

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

	profile := domain.User{
		Email:    "addressupdate@example.com",
		Name:     "Address Update",
		Password: "password",
	}
	err := service.CreateUserProfile(ctx, userID, profile)
	require.NoError(t, err)

	address := application.SavedAddress{
		Address: "Original Address",
	}
	addressID, err := service.AddSavedAddress(ctx, userID, address)
	require.NoError(t, err)

	updates := map[string]interface{}{
		"address": "Updated Address",
	}
	err = service.UpdateSavedAddress(ctx, userID, addressID, updates)
	require.NoError(t, err)

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

	profile := domain.User{
		Email:    "addressdelete@example.com",
		Name:     "Address Saved",
		Password: "password",
	}
	err := service.CreateUserProfile(ctx, userID, profile)
	require.NoError(t, err)

	address := application.SavedAddress{
		Address: "To Be Deleted",
	}
	addressID, err := service.AddSavedAddress(ctx, userID, address)
	require.NoError(t, err)

	err = service.DeleteSavedAddress(ctx, userID, addressID)
	require.NoError(t, err)

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

	profile := domain.User{
		Email:    "subcoll@example.com",
		Name:     "Subcollection Init",
		Password: "password",
	}
	err := service.CreateUserProfile(ctx, userID, profile)
	require.NoError(t, err)

	classes, err := service.GetUserClasses(ctx, userID)
	require.NoError(t, err)
	assert.NotNil(t, classes)

	addresses, err := service.GetSavedAddresses(ctx, userID)
	require.NoError(t, err)
	assert.NotNil(t, addresses)
}

func TestGetUserProfileByEmailNotFound(t *testing.T) {
	service := setupTestService(t)
	ctx := context.Background()

	_, err := service.GetUserProfileByEmail(ctx, "nonexistent-"+time.Now().Format("20060102150405")+"@example.com")
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "user not found")
}

func TestGetUserClassesEmpty(t *testing.T) {
	service := setupTestService(t)
	ctx := context.Background()
	userID := "test-user-empty-classes-" + time.Now().Format("20060102150405")

	profile := domain.User{
		Email:    "emptyclasses@example.com",
		Name:     "Empty Classes",
		Password: "password",
	}
	err := service.CreateUserProfile(ctx, userID, profile)
	require.NoError(t, err)

	classes, err := service.GetUserClasses(ctx, userID)
	require.NoError(t, err)
	assert.NotNil(t, classes)
	assert.Equal(t, 0, len(classes))
}

func TestGetSavedAddressesEmptyAddresses(t *testing.T) {
	service := setupTestService(t)
	ctx := context.Background()
	userID := "test-user-empty-addr-" + time.Now().Format("20060102150405")

	profile := domain.User{
		Email:    "emptyaddr@example.com",
		Name:     "Empty Address",
		Password: "password",
	}
	err := service.CreateUserProfile(ctx, userID, profile)
	require.NoError(t, err)

	addresses, err := service.GetSavedAddresses(ctx, userID)
	require.NoError(t, err)
	assert.NotNil(t, addresses)
	assert.Equal(t, 0, len(addresses))
}

func TestAddMultipleSavedAddresses(t *testing.T) {
	service := setupTestService(t)
	ctx := context.Background()
	userID := "test-user-multi-addr-" + time.Now().Format("20060102150405")

	profile := domain.User{
		Email:    "multiaddr@example.com",
		Name:     "Multi Address",
		Password: "password",
	}
	err := service.CreateUserProfile(ctx, userID, profile)
	require.NoError(t, err)

	addresses := []string{"Home", "Work", "Gym", "Library"}
	for _, addr := range addresses {
		address := application.SavedAddress{
			Address: addr,
		}
		_, err := service.AddSavedAddress(ctx, userID, address)
		require.NoError(t, err)
	}

	savedAddresses, err := service.GetSavedAddresses(ctx, userID)
	require.NoError(t, err)
	assert.GreaterOrEqual(t, len(savedAddresses), 4)
}

func TestAddAndGetDestinationHistory(t *testing.T) {
	service := setupTestService(t)
	ctx := context.Background()
	userID := "test-user-history-" + time.Now().Format("20060102150405")

	profile := domain.User{
		Email:    "history@example.com",
		Name:     "History User",
		Password: "password",
	}
	require.NoError(t, service.CreateUserProfile(ctx, userID, profile))

	item := application.DestinationHistoryItem{
		Name:            "Hall Building",
		Address:         "1455 De Maisonneuve Blvd W",
		BuildingCode:    "H",
		DestinationType: "building",
	}

	historyID, err := service.AddDestinationHistory(ctx, userID, item)
	require.NoError(t, err)
	require.NotEmpty(t, historyID)

	history, err := service.GetDestinationHistory(ctx, userID, 50)
	require.NoError(t, err)

	found := false
	for _, h := range history {
		if h.Name == "Hall Building" {
			found = true
			assert.Equal(t, "H", h.BuildingCode)
			assert.Equal(t, "building", h.DestinationType)
			assert.NotEmpty(t, h.HistoryID)
			break
		}
	}
	assert.True(t, found, "Destination history item not found")
}

func TestGetDestinationHistory_Limit(t *testing.T) {
	service := setupTestService(t)
	ctx := context.Background()
	userID := "test-user-history-limit-" + time.Now().Format("20060102150405")

	profile := domain.User{
		Email:    "historylimit@example.com",
		Name:     "History Limit",
		Password: "password",
	}
	require.NoError(t, service.CreateUserProfile(ctx, userID, profile))

	for i := 1; i <= 3; i++ {
		_, err := service.AddDestinationHistory(ctx, userID, application.DestinationHistoryItem{
			Name:            "Place " + strconv.Itoa(i),
			Address:         "Addr " + strconv.Itoa(i),
			DestinationType: "custom",
		})
		require.NoError(t, err)
	}

	history, err := service.GetDestinationHistory(ctx, userID, 2)
	require.NoError(t, err)
	assert.LessOrEqual(t, len(history), 2)
}

func TestClearDestinationHistory(t *testing.T) {
	service := setupTestService(t)
	ctx := context.Background()
	userID := "test-user-history-clear-" + time.Now().Format("20060102150405")

	profile := domain.User{
		Email:    "historyclear@example.com",
		Name:     "History Clear",
		Password: "password",
	}
	require.NoError(t, service.CreateUserProfile(ctx, userID, profile))

	_, err := service.AddDestinationHistory(ctx, userID, application.DestinationHistoryItem{
		Name:            "SGW",
		Address:         "Downtown",
		DestinationType: "campus",
	})
	require.NoError(t, err)

	require.NoError(t, service.ClearDestinationHistory(ctx, userID))

	history, err := service.GetDestinationHistory(ctx, userID, 50)
	require.NoError(t, err)

	for _, h := range history {
		assert.NotEqual(t, "SGW", h.Name)
	}
}

// TestSaveGetDeleteGoogleToken verifies SaveGoogleToken, GetGoogleToken and DeleteGoogleToken.
func TestSaveGetDeleteGoogleToken(t *testing.T) {
	service := setupTestService(t)
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	userID := "test-user-google-token-" + time.Now().Format("20060102150405")

	// Create a sample token
	now := time.Now().UTC()
	tok := &oauth2.Token{
		AccessToken:  "access-token-123",
		RefreshToken: "refresh-token-abc",
		Expiry:       now.Add(1 * time.Hour),
		TokenType:    "Bearer",
	}

	// Save token
	err := service.SaveGoogleToken(ctx, userID, tok)
	require.NoError(t, err, "SaveGoogleToken should not return an error")

	// Get token
	got, ok, err := service.GetGoogleToken(ctx, userID)
	require.NoError(t, err, "GetGoogleToken should not return an error")
	require.True(t, ok, "GetGoogleToken should indicate token exists")
	require.NotNil(t, got, "returned token should not be nil")

	// Validate fields (allow small timing differences for Expiry)
	assert.Equal(t, tok.AccessToken, got.AccessToken)
	assert.Equal(t, tok.RefreshToken, got.RefreshToken)
	assert.Equal(t, tok.TokenType, got.TokenType)
	assert.WithinDuration(t, tok.Expiry, got.Expiry, 2*time.Second)

	// Delete token
	err = service.DeleteGoogleToken(ctx, userID)
	require.NoError(t, err, "DeleteGoogleToken should not return an error")

	// Ensure token no longer exists
	got2, ok2, err := service.GetGoogleToken(ctx, userID)
	require.NoError(t, err, "GetGoogleToken after delete should not return an error")
	assert.False(t, ok2, "GetGoogleToken should report not found after delete")
	assert.Nil(t, got2, "returned token should be nil after delete")
}

// TestSaveGoogleToken_Nil verifies saving a nil token returns an error.
func TestSaveGoogleToken_Nil(t *testing.T) {
	service := setupTestService(t)
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	userID := "test-user-google-token-nil-" + time.Now().Format("20060102150405")

	err := service.SaveGoogleToken(ctx, userID, nil)
	require.Error(t, err, "SaveGoogleToken with nil token should return an error")
	assert.Contains(t, err.Error(), "token is nil")
}

// ===== GetNextClass integration tests =====

func TestGetNextClass_ReturnsItem(t *testing.T) {
	service := setupTestService(t)
	ctx := context.Background()
	userID := "test-user-next-class-" + time.Now().Format("20060102150405")

	profile := domain.User{Email: "nextclass@example.com", Name: "Next Class", Password: "password"}
	require.NoError(t, service.CreateUserProfile(ctx, userID, profile))

	require.NoError(t, service.CreateClass(ctx, userID, "SOEN345"))

	days := []string{"Monday", "Tuesday", "Wednesday", "Thursday", "Friday"}
	for _, day := range days {
		_, err := service.AddClassItem(ctx, userID, "SOEN345", domain.ClassItem{
			Type:      "lec",
			Section:   "AA",
			Day:       day,
			StartTime: "09:00",
			EndTime:   "10:15",
			Room:      "H-937",
		})
		require.NoError(t, err)
	}

	className, item, err := service.GetNextClass(ctx, userID)
	require.NoError(t, err)
	require.NotNil(t, item, "Expected a next class item")
	require.Equal(t, "SOEN345", className)
	require.Equal(t, "09:00", item.StartTime)
}

func TestGetNextClass_NoClasses(t *testing.T) {
	service := setupTestService(t)
	ctx := context.Background()
	userID := "test-user-no-classes-" + time.Now().Format("20060102150405")

	profile := domain.User{Email: "noclasses@example.com", Name: "No Classes", Password: "password"}
	require.NoError(t, service.CreateUserProfile(ctx, userID, profile))

	className, item, err := service.GetNextClass(ctx, userID)
	require.NoError(t, err)
	require.Nil(t, item)
	require.Empty(t, className)
}

func TestGetNextClass_MultipleClasses_ReturnsEarliest(t *testing.T) {
	service := setupTestService(t)
	ctx := context.Background()
	userID := "test-user-multi-next-" + time.Now().Format("20060102150405")

	profile := domain.User{Email: "multinext@example.com", Name: "Multi Next", Password: "password"}
	require.NoError(t, service.CreateUserProfile(ctx, userID, profile))

	require.NoError(t, service.CreateClass(ctx, userID, "SOEN345"))
	require.NoError(t, service.CreateClass(ctx, userID, "COMP352"))

	days := []string{"Monday", "Tuesday", "Wednesday", "Thursday", "Friday"}
	for _, day := range days {
		_, err := service.AddClassItem(ctx, userID, "SOEN345", domain.ClassItem{
			Type: "lec", Section: "AA", Day: day, StartTime: "10:00", EndTime: "11:15",
		})
		require.NoError(t, err)
		_, err = service.AddClassItem(ctx, userID, "COMP352", domain.ClassItem{
			Type: "lec", Section: "BB", Day: day, StartTime: "14:00", EndTime: "15:15",
		})
		require.NoError(t, err)
	}

	_, item, err := service.GetNextClass(ctx, userID)
	require.NoError(t, err)
	require.NotNil(t, item)

	require.Contains(t, []string{"10:00", "14:00"}, item.StartTime)
}

// ===== Favorites =====
func TestAddAndGetFavorites(t *testing.T) {
	service := setupTestService(t)
	ctx := context.Background()
	userID := "test-user-fav-" + time.Now().Format("20060102150405")

	profile := domain.User{Email: "fav@example.com", Name: "Fav User", Password: "password"}
	require.NoError(t, service.CreateUserProfile(ctx, userID, profile))

	fav := application.FirestoreFavorite{
		ID:        "fav-id-001",
		Type:      "outdoor",
		Name:      "Hall Building",
		Latitude:  45.4971,
		Longitude: -73.5789,
	}
	err := service.AddFavorite(ctx, userID, fav)
	require.NoError(t, err)

	favorites, err := service.GetFavorites(ctx, userID)
	require.NoError(t, err)

	found := false
	for _, f := range favorites {
		if f.ID == "fav-id-001" {
			found = true
			assert.Equal(t, "Hall Building", f.Name)
			assert.Equal(t, "outdoor", f.Type)
			assert.InDelta(t, 45.4971, f.Latitude, 0.0001)
			assert.InDelta(t, -73.5789, f.Longitude, 0.0001)
			break
		}
	}
	assert.True(t, found, "Favorite not found in Firestore")
}

func TestGetFavoritesEmpty(t *testing.T) {
	service := setupTestService(t)
	ctx := context.Background()
	userID := "test-user-fav-empty-" + time.Now().Format("20060102150405")

	profile := domain.User{Email: "favempty@example.com", Name: "Fav Empty", Password: "password"}
	require.NoError(t, service.CreateUserProfile(ctx, userID, profile))

	favorites, err := service.GetFavorites(ctx, userID)
	require.NoError(t, err)
	assert.Equal(t, 0, len(favorites))
}

func TestDeleteFavorite_Firestore(t *testing.T) {
	service := setupTestService(t)
	ctx := context.Background()
	userID := "test-user-fav-del-" + time.Now().Format("20060102150405")

	profile := domain.User{Email: "favdel@example.com", Name: "Fav Del", Password: "password"}
	require.NoError(t, service.CreateUserProfile(ctx, userID, profile))

	fav := application.FirestoreFavorite{ID: "fav-del-001", Type: "outdoor", Name: "EV Building", Latitude: 45.4954, Longitude: -73.5782}
	require.NoError(t, service.AddFavorite(ctx, userID, fav))

	err := service.DeleteFavorite(ctx, userID, "fav-del-001")
	require.NoError(t, err)

	favorites, err := service.GetFavorites(ctx, userID)
	require.NoError(t, err)
	for _, f := range favorites {
		assert.NotEqual(t, "fav-del-001", f.ID, "Deleted favorite still present")
	}
}

func TestDeleteFavoriteNotFound_Firestore(t *testing.T) {
	service := setupTestService(t)
	ctx := context.Background()
	userID := "test-user-fav-notfound-" + time.Now().Format("20060102150405")

	profile := domain.User{Email: "favnotfound@example.com", Name: "Fav NotFound", Password: "password"}
	require.NoError(t, service.CreateUserProfile(ctx, userID, profile))

	err := service.DeleteFavorite(ctx, userID, "nonexistent-fav-id")
	assert.ErrorIs(t, err, domain.ErrFavoriteNotFound)
}

func TestAddMultipleFavorites(t *testing.T) {
	service := setupTestService(t)
	ctx := context.Background()
	userID := "test-user-fav-multi-" + time.Now().Format("20060102150405")

	profile := domain.User{Email: "favmulti@example.com", Name: "Fav Multi", Password: "password"}
	require.NoError(t, service.CreateUserProfile(ctx, userID, profile))

	favs := []application.FirestoreFavorite{
		{ID: "fav-m-001", Type: "outdoor", Name: "Hall Building", Latitude: 45.4971, Longitude: -73.5789},
		{ID: "fav-m-002", Type: "outdoor", Name: "EV Building", Latitude: 45.4954, Longitude: -73.5782},
		{ID: "fav-m-003", Type: "outdoor", Name: "Library", Latitude: 45.4960, Longitude: -73.5780},
	}
	for _, f := range favs {
		require.NoError(t, service.AddFavorite(ctx, userID, f))
	}

	result, err := service.GetFavorites(ctx, userID)
	require.NoError(t, err)
	assert.GreaterOrEqual(t, len(result), 3)
}

func TestFavoritesSubcollectionInitialized(t *testing.T) {
	service := setupTestService(t)
	ctx := context.Background()
	userID := "test-user-fav-init-" + time.Now().Format("20060102150405")

	profile := domain.User{Email: "favinit@example.com", Name: "Fav Init", Password: "password"}
	require.NoError(t, service.CreateUserProfile(ctx, userID, profile))

	// Favorites subcollection should be queryable immediately after user creation
	favorites, err := service.GetFavorites(ctx, userID)
	require.NoError(t, err)
	assert.NotNil(t, favorites)
	assert.Equal(t, 0, len(favorites)) // no real favorites yet, only _init placeholder
}

func TestFirestoreFavoriteRepository_Lifecycle(t *testing.T) {
	service := setupTestService(t)
	repo := application.NewFirestoreFavoriteRepository(service)

	userID := "repo-user-" + time.Now().Format("20060102150405")
	favID := "fav-repo-1"

	// 1. Create
	fav := &domain.Favorite{
		ID:        favID,
		UserID:    userID,
		Type:      domain.FavoriteTypeOutdoor,
		Name:      "Repo Place",
		Latitude:  10.0,
		Longitude: 20.0,
	}
	err := repo.Create(fav)
	require.NoError(t, err)

	// 2. FindByUserID
	list, err := repo.FindByUserID(userID)
	require.NoError(t, err)
	require.Len(t, list, 1)
	assert.Equal(t, "Repo Place", list[0].Name)

	// 3. Delete
	err = repo.Delete(favID, userID)
	require.NoError(t, err)

	// Verify empty
	list, err = repo.FindByUserID(userID)
	require.NoError(t, err)
	assert.Empty(t, list)
}

func TestHybridFavoriteRepository_Routing(t *testing.T) {
	service := setupTestService(t)
	hybrid := application.NewHybridFavoriteRepository(service)

	// Case 1: Authenticated User -> Firestore
	authUser := "auth-user-" + time.Now().Format("20060102150405")
	authFav := &domain.Favorite{ID: "auth-fav", UserID: authUser, Type: domain.FavoriteTypeOutdoor, Name: "Auth Home", Latitude: 1, Longitude: 1}
	require.NoError(t, hybrid.Create(authFav))
	listAuth, err := hybrid.FindByUserID(authUser)
	require.NoError(t, err)
	require.Len(t, listAuth, 1)

	// Case 2: Anonymous User -> Memory
	anonUser := ""
	anonFav := &domain.Favorite{ID: "anon-fav", UserID: anonUser, Type: domain.FavoriteTypeOutdoor, Name: "Anon Home", Latitude: 2, Longitude: 2}
	require.NoError(t, hybrid.Create(anonFav))
	listAnon, err := hybrid.FindByUserID(anonUser)
	require.NoError(t, err)
	require.Len(t, listAnon, 1)

	// Verify Deletion Routing
	require.NoError(t, hybrid.Delete("auth-fav", authUser))
	require.NoError(t, hybrid.Delete("anon-fav", anonUser))
}

// ===== FavoritesService unit tests =====

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

// failRepo is a mock repository that always fails on Create.
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

func TestGetAllClassItems(t *testing.T) {
	service := setupTestService(t)
	ctx := context.Background()

	userID := "test-user-getall-" + time.Now().Format("20060102150405")

	profile := domain.User{
		Email:    "getall@example.com",
		Name:     "Get All User",
		Password: "password",
	}
	require.NoError(t, service.CreateUserProfile(ctx, userID, profile))

	// create two classes
	titleA := "TESTA-" + time.Now().Format("150405")
	titleB := "TESTB-" + time.Now().Format("150405")

	require.NoError(t, service.CreateClass(ctx, userID, titleA))
	require.NoError(t, service.CreateClass(ctx, userID, titleB))

	// add items to both classes
	itemA := domain.ClassItem{
		Type:         "lec",
		Section:      "A1",
		Day:          "Monday",
		StartTime:    "09:00",
		EndTime:      "10:00",
		BuildingCode: "H",
		Room:         "H-100",
	}
	itemB := domain.ClassItem{
		Type:         "tut",
		Section:      "T1",
		Day:          "Wednesday",
		StartTime:    "11:00",
		EndTime:      "12:00",
		BuildingCode: "EV",
		Room:         "EV-200",
	}

	idA, err := service.AddClassItem(ctx, userID, titleA, itemA)
	require.NoError(t, err)
	require.NotEmpty(t, idA)

	idB, err := service.AddClassItem(ctx, userID, titleB, itemB)
	require.NoError(t, err)
	require.NotEmpty(t, idB)

	// retrieve everything
	all, err := service.GetAllClassItems(userID)
	require.NoError(t, err)

	// ensure both classes are present
	assert.Contains(t, all, titleA)
	assert.Contains(t, all, titleB)

	// ensure items are present and contain our added entries
	itemsA, ok := all[titleA]
	require.True(t, ok)
	assert.GreaterOrEqual(t, len(itemsA), 1)

	foundA := false
	for _, it := range itemsA {
		if it.ClassID == idA {
			foundA = true
			assert.Equal(t, "lec", it.Type)
			assert.Equal(t, "A1", it.Section)
			assert.Equal(t, "09:00", it.StartTime)
			assert.Equal(t, "10:00", it.EndTime)
			assert.Equal(t, "H", it.BuildingCode)
			assert.Equal(t, "H-100", it.Room)
			break
		}
	}
	assert.True(t, foundA, "expected item for class A not found")

	itemsB, ok := all[titleB]
	require.True(t, ok)
	assert.GreaterOrEqual(t, len(itemsB), 1)

	foundB := false
	for _, it := range itemsB {
		if it.ClassID == idB {
			foundB = true
			assert.Equal(t, "tut", it.Type)
			assert.Equal(t, "T1", it.Section)
			assert.Equal(t, "11:00", it.StartTime)
			assert.Equal(t, "12:00", it.EndTime)
			assert.Equal(t, "EV", it.BuildingCode)
			assert.Equal(t, "EV-200", it.Room)
			break
		}
	}
	assert.True(t, foundB, "expected item for class B not found")
}
