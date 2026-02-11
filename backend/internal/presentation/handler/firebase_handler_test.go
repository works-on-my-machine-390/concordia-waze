package handler

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
	"github.com/works-on-my-machine-390/concordia-waze/internal/application"
)

type fakeFirebaseService struct {
	createUserProfileFn  func(ctx context.Context, userID string, profile application.User) error
	getUserProfileFn     func(ctx context.Context, userID string) (*application.User, error)
	addSearchHistoryFn   func(ctx context.Context, userID string, item application.SearchHistoryItem) (string, error)
	getSearchHistoryFn   func(ctx context.Context, userID string, limit int) ([]application.SearchHistoryItem, error)
	clearSearchHistoryFn func(ctx context.Context, userID string) error
	addScheduleItemFn    func(ctx context.Context, userID string, item application.ScheduleItem) (string, error)
	getUserScheduleFn    func(ctx context.Context, userID string) ([]application.ScheduleItem, error)
	updateScheduleFn     func(ctx context.Context, userID, scheduleID string, updates map[string]interface{}) error
	deleteScheduleFn     func(ctx context.Context, userID, scheduleID string) error
	addSavedAddressFn    func(ctx context.Context, userID string, address application.SavedAddress) (string, error)
	getSavedAddressesFn  func(ctx context.Context, userID string) ([]application.SavedAddress, error)
	updateSavedAddressFn func(ctx context.Context, userID, addressID string, updates map[string]interface{}) error
	deleteSavedAddressFn func(ctx context.Context, userID, addressID string) error
}

func (f *fakeFirebaseService) CreateUserProfile(ctx context.Context, userID string, profile application.User) error {
	if f.createUserProfileFn != nil {
		return f.createUserProfileFn(ctx, userID, profile)
	}
	return nil
}

func (f *fakeFirebaseService) GetUserProfile(ctx context.Context, userID string) (*application.User, error) {
	if f.getUserProfileFn != nil {
		return f.getUserProfileFn(ctx, userID)
	}
	return &application.User{UserID: userID}, nil
}

func (f *fakeFirebaseService) AddSearchHistory(ctx context.Context, userID string, item application.SearchHistoryItem) (string, error) {
	if f.addSearchHistoryFn != nil {
		return f.addSearchHistoryFn(ctx, userID, item)
	}
	return "search_1", nil
}

func (f *fakeFirebaseService) GetSearchHistory(ctx context.Context, userID string, limit int) ([]application.SearchHistoryItem, error) {
	if f.getSearchHistoryFn != nil {
		return f.getSearchHistoryFn(ctx, userID, limit)
	}
	return []application.SearchHistoryItem{}, nil
}

func (f *fakeFirebaseService) ClearSearchHistory(ctx context.Context, userID string) error {
	if f.clearSearchHistoryFn != nil {
		return f.clearSearchHistoryFn(ctx, userID)
	}
	return nil
}

func (f *fakeFirebaseService) AddScheduleItem(ctx context.Context, userID string, item application.ScheduleItem) (string, error) {
	if f.addScheduleItemFn != nil {
		return f.addScheduleItemFn(ctx, userID, item)
	}
	return "schedule_1", nil
}

func (f *fakeFirebaseService) GetUserSchedule(ctx context.Context, userID string) ([]application.ScheduleItem, error) {
	if f.getUserScheduleFn != nil {
		return f.getUserScheduleFn(ctx, userID)
	}
	return []application.ScheduleItem{}, nil
}

func (f *fakeFirebaseService) UpdateScheduleItem(ctx context.Context, userID, scheduleID string, updates map[string]interface{}) error {
	if f.updateScheduleFn != nil {
		return f.updateScheduleFn(ctx, userID, scheduleID, updates)
	}
	return nil
}

func (f *fakeFirebaseService) DeleteScheduleItem(ctx context.Context, userID, scheduleID string) error {
	if f.deleteScheduleFn != nil {
		return f.deleteScheduleFn(ctx, userID, scheduleID)
	}
	return nil
}

func (f *fakeFirebaseService) AddSavedAddress(ctx context.Context, userID string, address application.SavedAddress) (string, error) {
	if f.addSavedAddressFn != nil {
		return f.addSavedAddressFn(ctx, userID, address)
	}
	return "address_1", nil
}

func (f *fakeFirebaseService) GetSavedAddresses(ctx context.Context, userID string) ([]application.SavedAddress, error) {
	if f.getSavedAddressesFn != nil {
		return f.getSavedAddressesFn(ctx, userID)
	}
	return []application.SavedAddress{}, nil
}

func (f *fakeFirebaseService) UpdateSavedAddress(ctx context.Context, userID, addressID string, updates map[string]interface{}) error {
	if f.updateSavedAddressFn != nil {
		return f.updateSavedAddressFn(ctx, userID, addressID, updates)
	}
	return nil
}

func (f *fakeFirebaseService) DeleteSavedAddress(ctx context.Context, userID, addressID string) error {
	if f.deleteSavedAddressFn != nil {
		return f.deleteSavedAddressFn(ctx, userID, addressID)
	}
	return nil
}

func TestCreateUserProfileBadRequest(t *testing.T) {
	gin.SetMode(gin.TestMode)
	service := &fakeFirebaseService{}
	h := NewFirebaseHandler(service)

	r := gin.New()
	r.POST("/users/:userId/profile", h.CreateUserProfile)

	request := httptest.NewRequest(http.MethodPost, "/users/u1/profile", bytes.NewBufferString("{"))
	request.Header.Set("Content-Type", "application/json")
	response := httptest.NewRecorder()

	r.ServeHTTP(response, request)
	require.Equal(t, http.StatusBadRequest, response.Code)
}

func TestCreateUserProfileSuccess(t *testing.T) {
	gin.SetMode(gin.TestMode)
	called := false
	service := &fakeFirebaseService{
		createUserProfileFn: func(ctx context.Context, userID string, profile application.User) error {
			called = true
			require.Equal(t, "user_1", userID)
			return nil
		},
	}
	h := NewFirebaseHandler(service)

	r := gin.New()
	r.POST("/users/:userId/profile", h.CreateUserProfile)

	payload := application.User{Email: "a@b.com", FirstName: "A", LastName: "B"}
	body, err := json.Marshal(payload)
	require.NoError(t, err)

	request := httptest.NewRequest(http.MethodPost, "/users/user_1/profile", bytes.NewBuffer(body))
	request.Header.Set("Content-Type", "application/json")
	response := httptest.NewRecorder()

	r.ServeHTTP(response, request)
	require.Equal(t, http.StatusCreated, response.Code)
	require.True(t, called)
}

func TestGetSearchHistoryLimitParam(t *testing.T) {
	gin.SetMode(gin.TestMode)
	service := &fakeFirebaseService{
		getSearchHistoryFn: func(ctx context.Context, userID string, limit int) ([]application.SearchHistoryItem, error) {
			require.Equal(t, 10, limit)
			return []application.SearchHistoryItem{{Query: "Hall"}}, nil
		},
	}
	h := NewFirebaseHandler(service)

	r := gin.New()
	r.GET("/users/:userId/search-history", h.GetSearchHistory)

	request := httptest.NewRequest(http.MethodGet, "/users/u1/search-history?limit=10", nil)
	response := httptest.NewRecorder()

	r.ServeHTTP(response, request)
	require.Equal(t, http.StatusOK, response.Code)
}

func TestGetSavedAddressessavedAddressesParam(t *testing.T) {
	gin.SetMode(gin.TestMode)
	service := &fakeFirebaseService{
		getSavedAddressesFn: func(ctx context.Context, userID string) ([]application.SavedAddress, error) {
			return []application.SavedAddress{{Address: "123 St"}}, nil
		},
	}
	h := NewFirebaseHandler(service)

	r := gin.New()
	r.GET("/users/:userId/savedAddresses", h.GetSavedAddresses)

	request := httptest.NewRequest(http.MethodGet, "/users/u1/savedAddresses", nil)
	response := httptest.NewRecorder()

	r.ServeHTTP(response, request)
	require.Equal(t, http.StatusOK, response.Code)
}
