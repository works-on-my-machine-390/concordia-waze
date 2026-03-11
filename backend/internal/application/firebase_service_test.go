package application_test

import (
	"context"
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

	_, err = service.AddClassItem(ctx, userID, title, application.ClassItem{
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

	item := application.ClassItem{
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
		if i.ItemID == itemID {
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

	item := application.ClassItem{
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
		if i.ItemID == itemID {
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

	item := application.ClassItem{
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
		assert.NotEqual(t, itemID, i.ItemID, "Deleted item still exists")
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

	item := application.ClassItem{
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
		if i.ItemID == itemID {
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

	item := application.ClassItem{
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
		if i.ItemID == itemID {
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
