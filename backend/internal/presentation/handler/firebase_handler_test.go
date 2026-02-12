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
	"github.com/works-on-my-machine-390/concordia-waze/internal/domain"
)

type fakeFirebaseService struct {
	createUserProfileFn  func(ctx context.Context, userID string, profile domain.User) error
	getUserProfileFn     func(ctx context.Context, userID string) (*domain.User, error)
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

func (f *fakeFirebaseService) CreateUserProfile(ctx context.Context, userID string, profile domain.User) error {
	if f.createUserProfileFn != nil {
		return f.createUserProfileFn(ctx, userID, profile)
	}
	return nil
}

func (f *fakeFirebaseService) GetUserProfile(ctx context.Context, userID string) (*domain.User, error) {
	if f.getUserProfileFn != nil {
		return f.getUserProfileFn(ctx, userID)
	}
	return &domain.User{ID: userID}, nil
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
		createUserProfileFn: func(ctx context.Context, userID string, profile domain.User) error {
			called = true
			require.Equal(t, "user_1", userID)
			return nil
		},
	}
	h := NewFirebaseHandler(service)

	r := gin.New()
	r.POST("/users/:userId/profile", h.CreateUserProfile)

	payload := domain.User{Email: "a@b.com", Name: "A B"}
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

func TestGetUserProfileSuccess(t *testing.T) {
	gin.SetMode(gin.TestMode)
	service := &fakeFirebaseService{
		getUserProfileFn: func(ctx context.Context, userID string) (*domain.User, error) {
			require.Equal(t, "user_1", userID)
			return &domain.User{ID: "user_1", Email: "test@example.com"}, nil
		},
	}
	h := NewFirebaseHandler(service)

	r := gin.New()
	r.GET("/users/:userId/profile", h.GetUserProfile)

	request := httptest.NewRequest(http.MethodGet, "/users/user_1/profile", nil)
	response := httptest.NewRecorder()

	r.ServeHTTP(response, request)
	require.Equal(t, http.StatusOK, response.Code)
}

func TestGetUserProfileNotFound(t *testing.T) {
	gin.SetMode(gin.TestMode)
	service := &fakeFirebaseService{
		getUserProfileFn: func(ctx context.Context, userID string) (*domain.User, error) {
			return nil, context.Canceled
		},
	}
	h := NewFirebaseHandler(service)

	r := gin.New()
	r.GET("/users/:userId/profile", h.GetUserProfile)

	request := httptest.NewRequest(http.MethodGet, "/users/nonexistent/profile", nil)
	response := httptest.NewRecorder()

	r.ServeHTTP(response, request)
	require.Equal(t, http.StatusNotFound, response.Code)
}

func TestAddSearchHistorySuccess(t *testing.T) {
	gin.SetMode(gin.TestMode)
	service := &fakeFirebaseService{
		addSearchHistoryFn: func(ctx context.Context, userID string, item application.SearchHistoryItem) (string, error) {
			require.Equal(t, "user_1", userID)
			require.Equal(t, "JMSB", item.Query)
			return "search_123", nil
		},
	}
	h := NewFirebaseHandler(service)

	r := gin.New()
	r.POST("/users/:userId/search-history", h.AddSearchHistory)

	payload := application.SearchHistoryItem{Query: "JMSB", Locations: "1455 De Maisonneuve"}
	body, err := json.Marshal(payload)
	require.NoError(t, err)

	request := httptest.NewRequest(http.MethodPost, "/users/user_1/search-history", bytes.NewBuffer(body))
	request.Header.Set("Content-Type", "application/json")
	response := httptest.NewRecorder()

	r.ServeHTTP(response, request)
	require.Equal(t, http.StatusCreated, response.Code)
}

func TestAddSearchHistoryBadRequest(t *testing.T) {
	gin.SetMode(gin.TestMode)
	service := &fakeFirebaseService{}
	h := NewFirebaseHandler(service)

	r := gin.New()
	r.POST("/users/:userId/search-history", h.AddSearchHistory)

	request := httptest.NewRequest(http.MethodPost, "/users/user_1/search-history", bytes.NewBufferString("{invalid"))
	request.Header.Set("Content-Type", "application/json")
	response := httptest.NewRecorder()

	r.ServeHTTP(response, request)
	require.Equal(t, http.StatusBadRequest, response.Code)
}

func TestClearSearchHistorySuccess(t *testing.T) {
	gin.SetMode(gin.TestMode)
	service := &fakeFirebaseService{
		clearSearchHistoryFn: func(ctx context.Context, userID string) error {
			require.Equal(t, "user_1", userID)
			return nil
		},
	}
	h := NewFirebaseHandler(service)

	r := gin.New()
	r.DELETE("/users/:userId/search-history", h.ClearSearchHistory)

	request := httptest.NewRequest(http.MethodDelete, "/users/user_1/search-history", nil)
	response := httptest.NewRecorder()

	r.ServeHTTP(response, request)
	require.Equal(t, http.StatusOK, response.Code)
}

func TestClearSearchHistoryError(t *testing.T) {
	gin.SetMode(gin.TestMode)
	service := &fakeFirebaseService{
		clearSearchHistoryFn: func(ctx context.Context, userID string) error {
			return context.Canceled
		},
	}
	h := NewFirebaseHandler(service)

	r := gin.New()
	r.DELETE("/users/:userId/search-history", h.ClearSearchHistory)

	request := httptest.NewRequest(http.MethodDelete, "/users/user_1/search-history", nil)
	response := httptest.NewRecorder()

	r.ServeHTTP(response, request)
	require.Equal(t, http.StatusInternalServerError, response.Code)
}

func TestAddScheduleItemSuccess(t *testing.T) {
	gin.SetMode(gin.TestMode)
	service := &fakeFirebaseService{
		addScheduleItemFn: func(ctx context.Context, userID string, item application.ScheduleItem) (string, error) {
			require.Equal(t, "user_1", userID)
			require.Equal(t, "Class", item.Name)
			return "schedule_123", nil
		},
	}
	h := NewFirebaseHandler(service)

	r := gin.New()
	r.POST("/users/:userId/schedule", h.AddScheduleItem)

	payload := application.ScheduleItem{
		Name:       "Class",
		StartTime:  "10:00",
		EndTime:    "11:30",
		DaysOfWeek: []string{"Monday"},
	}
	body, err := json.Marshal(payload)
	require.NoError(t, err)

	request := httptest.NewRequest(http.MethodPost, "/users/user_1/schedule", bytes.NewBuffer(body))
	request.Header.Set("Content-Type", "application/json")
	response := httptest.NewRecorder()

	r.ServeHTTP(response, request)
	require.Equal(t, http.StatusCreated, response.Code)
}

func TestAddScheduleItemBadRequest(t *testing.T) {
	gin.SetMode(gin.TestMode)
	service := &fakeFirebaseService{}
	h := NewFirebaseHandler(service)

	r := gin.New()
	r.POST("/users/:userId/schedule", h.AddScheduleItem)

	request := httptest.NewRequest(http.MethodPost, "/users/user_1/schedule", bytes.NewBufferString("{bad"))
	request.Header.Set("Content-Type", "application/json")
	response := httptest.NewRecorder()

	r.ServeHTTP(response, request)
	require.Equal(t, http.StatusBadRequest, response.Code)
}

func TestGetUserScheduleSuccess(t *testing.T) {
	gin.SetMode(gin.TestMode)
	service := &fakeFirebaseService{
		getUserScheduleFn: func(ctx context.Context, userID string) ([]application.ScheduleItem, error) {
			require.Equal(t, "user_1", userID)
			return []application.ScheduleItem{
				{Name: "Class", StartTime: "10:00", EndTime: "11:30"},
			}, nil
		},
	}
	h := NewFirebaseHandler(service)

	r := gin.New()
	r.GET("/users/:userId/schedule", h.GetUserSchedule)

	request := httptest.NewRequest(http.MethodGet, "/users/user_1/schedule", nil)
	response := httptest.NewRecorder()

	r.ServeHTTP(response, request)
	require.Equal(t, http.StatusOK, response.Code)
}

func TestGetUserScheduleError(t *testing.T) {
	gin.SetMode(gin.TestMode)
	service := &fakeFirebaseService{
		getUserScheduleFn: func(ctx context.Context, userID string) ([]application.ScheduleItem, error) {
			return nil, context.Canceled
		},
	}
	h := NewFirebaseHandler(service)

	r := gin.New()
	r.GET("/users/:userId/schedule", h.GetUserSchedule)

	request := httptest.NewRequest(http.MethodGet, "/users/user_1/schedule", nil)
	response := httptest.NewRecorder()

	r.ServeHTTP(response, request)
	require.Equal(t, http.StatusInternalServerError, response.Code)
}

func TestUpdateScheduleItemSuccess(t *testing.T) {
	gin.SetMode(gin.TestMode)
	service := &fakeFirebaseService{
		updateScheduleFn: func(ctx context.Context, userID, scheduleID string, updates map[string]interface{}) error {
			require.Equal(t, "user_1", userID)
			require.Equal(t, "schedule_1", scheduleID)
			return nil
		},
	}
	h := NewFirebaseHandler(service)

	r := gin.New()
	r.PATCH("/users/:userId/schedule/:scheduleId", h.UpdateScheduleItem)

	payload := map[string]interface{}{"name": "Updated Class"}
	body, err := json.Marshal(payload)
	require.NoError(t, err)

	request := httptest.NewRequest(http.MethodPatch, "/users/user_1/schedule/schedule_1", bytes.NewBuffer(body))
	request.Header.Set("Content-Type", "application/json")
	response := httptest.NewRecorder()

	r.ServeHTTP(response, request)
	require.Equal(t, http.StatusOK, response.Code)
}

func TestDeleteScheduleItemSuccess(t *testing.T) {
	gin.SetMode(gin.TestMode)
	service := &fakeFirebaseService{
		deleteScheduleFn: func(ctx context.Context, userID, scheduleID string) error {
			require.Equal(t, "user_1", userID)
			require.Equal(t, "schedule_1", scheduleID)
			return nil
		},
	}
	h := NewFirebaseHandler(service)

	r := gin.New()
	r.DELETE("/users/:userId/schedule/:scheduleId", h.DeleteScheduleItem)

	request := httptest.NewRequest(http.MethodDelete, "/users/user_1/schedule/schedule_1", nil)
	response := httptest.NewRecorder()

	r.ServeHTTP(response, request)
	require.Equal(t, http.StatusOK, response.Code)
}

func TestAddSavedAddressSuccess(t *testing.T) {
	gin.SetMode(gin.TestMode)
	service := &fakeFirebaseService{
		addSavedAddressFn: func(ctx context.Context, userID string, address application.SavedAddress) (string, error) {
			require.Equal(t, "user_1", userID)
			require.Equal(t, "123 Main St", address.Address)
			return "address_123", nil
		},
	}
	h := NewFirebaseHandler(service)

	r := gin.New()
	r.POST("/users/:userId/saved-addresses", h.AddSavedAddress)

	payload := application.SavedAddress{Address: "123 Main St"}
	body, err := json.Marshal(payload)
	require.NoError(t, err)

	request := httptest.NewRequest(http.MethodPost, "/users/user_1/saved-addresses", bytes.NewBuffer(body))
	request.Header.Set("Content-Type", "application/json")
	response := httptest.NewRecorder()

	r.ServeHTTP(response, request)
	require.Equal(t, http.StatusCreated, response.Code)
}

func TestAddSavedAddressError(t *testing.T) {
	gin.SetMode(gin.TestMode)
	service := &fakeFirebaseService{
		addSavedAddressFn: func(ctx context.Context, userID string, address application.SavedAddress) (string, error) {
			return "", context.Canceled
		},
	}
	h := NewFirebaseHandler(service)

	r := gin.New()
	r.POST("/users/:userId/saved-addresses", h.AddSavedAddress)

	payload := application.SavedAddress{Address: "123 Main St"}
	body, err := json.Marshal(payload)
	require.NoError(t, err)

	request := httptest.NewRequest(http.MethodPost, "/users/user_1/saved-addresses", bytes.NewBuffer(body))
	request.Header.Set("Content-Type", "application/json")
	response := httptest.NewRecorder()

	r.ServeHTTP(response, request)
	require.Equal(t, http.StatusInternalServerError, response.Code)
}

func TestUpdateSavedAddressSuccess(t *testing.T) {
	gin.SetMode(gin.TestMode)
	service := &fakeFirebaseService{
		updateSavedAddressFn: func(ctx context.Context, userID, addressID string, updates map[string]interface{}) error {
			require.Equal(t, "user_1", userID)
			require.Equal(t, "address_1", addressID)
			return nil
		},
	}
	h := NewFirebaseHandler(service)

	r := gin.New()
	r.PATCH("/users/:userId/saved-addresses/:addressId", h.UpdateSavedAddress)

	payload := map[string]interface{}{"address": "456 New St"}
	body, err := json.Marshal(payload)
	require.NoError(t, err)

	request := httptest.NewRequest(http.MethodPatch, "/users/user_1/saved-addresses/address_1", bytes.NewBuffer(body))
	request.Header.Set("Content-Type", "application/json")
	response := httptest.NewRecorder()

	r.ServeHTTP(response, request)
	require.Equal(t, http.StatusOK, response.Code)
}

func TestDeleteSavedAddressSuccess(t *testing.T) {
	gin.SetMode(gin.TestMode)
	service := &fakeFirebaseService{
		deleteSavedAddressFn: func(ctx context.Context, userID, addressID string) error {
			require.Equal(t, "user_1", userID)
			require.Equal(t, "address_1", addressID)
			return nil
		},
	}
	h := NewFirebaseHandler(service)

	r := gin.New()
	r.DELETE("/users/:userId/saved-addresses/:addressId", h.DeleteSavedAddress)

	request := httptest.NewRequest(http.MethodDelete, "/users/user_1/saved-addresses/address_1", nil)
	response := httptest.NewRecorder()

	r.ServeHTTP(response, request)
	require.Equal(t, http.StatusOK, response.Code)
}
