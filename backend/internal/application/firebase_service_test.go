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

func TestAddAndGetDestinationHistory(t *testing.T) {
	service := setupTestService(t)
	ctx := context.Background()
	userID := "test-user-history-" + time.Now().Format("20060102150405")

	// Create user first (so subcollections exist)
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

	// Add 3 items
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

	// Depending on your implementation, you might keep a placeholder doc like "_init".
	// So we just assert there is no real data item with Name "SGW".
	for _, h := range history {
		assert.NotEqual(t, "SGW", h.Name)
	}
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

	fav := application.FirestoreFavorite{ID: "fav-del-001", Name: "EV Building", Latitude: 45.4954, Longitude: -73.5782}
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
		{ID: "fav-m-001", Name: "Hall Building", Latitude: 45.4971, Longitude: -73.5789},
		{ID: "fav-m-002", Name: "EV Building", Latitude: 45.4954, Longitude: -73.5782},
		{ID: "fav-m-003", Name: "Library", Latitude: 45.4960, Longitude: -73.5780},
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
	authFav := &domain.Favorite{ID: "auth-fav", UserID: authUser, Name: "Auth Home", Latitude: 1, Longitude: 1}
	require.NoError(t, hybrid.Create(authFav))
	listAuth, err := hybrid.FindByUserID(authUser)
	require.NoError(t, err)
	require.Len(t, listAuth, 1)

	// Case 2: Anonymous User -> Memory
	anonUser := ""
	anonFav := &domain.Favorite{ID: "anon-fav", UserID: anonUser, Name: "Anon Home", Latitude: 2, Longitude: 2}
	require.NoError(t, hybrid.Create(anonFav))
	listAnon, err := hybrid.FindByUserID(anonUser)
	require.NoError(t, err)
	require.Len(t, listAnon, 1)

	// Verify Deletion Routing
	require.NoError(t, hybrid.Delete("auth-fav", authUser))
	require.NoError(t, hybrid.Delete("anon-fav", anonUser))
}
