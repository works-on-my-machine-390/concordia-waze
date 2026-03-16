package handler

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
	"github.com/works-on-my-machine-390/concordia-waze/internal/domain"
)

type fakeScheduleService struct {
	createClassFn     func(ctx context.Context, userID, title string) error
	getUserClassesFn  func(ctx context.Context, userID string) ([]string, error)
	getClassItemsFn   func(ctx context.Context, userID, title string) ([]domain.ClassItem, error)
	addClassItemFn    func(ctx context.Context, userID, title string, item domain.ClassItem) (string, error)
	updateClassItemFn func(ctx context.Context, userID, title, classID string, updates map[string]interface{}) error
	deleteClassItemFn func(ctx context.Context, userID, title, classID string) error
	deleteClassFn     func(ctx context.Context, userID, title string) error
	getNextClassFn    func(ctx context.Context, userID string) (string, *domain.ClassItem, error)
}

func (f *fakeScheduleService) CreateClass(ctx context.Context, userID, title string) error {
	if f.createClassFn != nil {
		return f.createClassFn(ctx, userID, title)
	}
	return nil
}

func (f *fakeScheduleService) GetUserClasses(ctx context.Context, userID string) ([]string, error) {
	if f.getUserClassesFn != nil {
		return f.getUserClassesFn(ctx, userID)
	}
	return []string{}, nil
}

func (f *fakeScheduleService) GetClassItems(ctx context.Context, userID, title string) ([]domain.ClassItem, error) {
	if f.getClassItemsFn != nil {
		return f.getClassItemsFn(ctx, userID, title)
	}
	return []domain.ClassItem{}, nil
}

func (f *fakeScheduleService) AddClassItem(ctx context.Context, userID, title string, item domain.ClassItem) (string, error) {
	if f.addClassItemFn != nil {
		return f.addClassItemFn(ctx, userID, title, item)
	}
	return "class_1", nil
}

func (f *fakeScheduleService) UpdateClassItem(ctx context.Context, userID, title, classID string, updates map[string]interface{}) error {
	if f.updateClassItemFn != nil {
		return f.updateClassItemFn(ctx, userID, title, classID, updates)
	}
	return nil
}

func (f *fakeScheduleService) DeleteClassItem(ctx context.Context, userID, title, classID string) error {
	if f.deleteClassItemFn != nil {
		return f.deleteClassItemFn(ctx, userID, title, classID)
	}
	return nil
}

func (f *fakeScheduleService) DeleteClass(ctx context.Context, userID, title string) error {
	if f.deleteClassFn != nil {
		return f.deleteClassFn(ctx, userID, title)
	}
	return nil
}

func (f *fakeScheduleService) GetNextClass(ctx context.Context, userID string) (string, *domain.ClassItem, error) {
	if f.getNextClassFn != nil {
		return f.getNextClassFn(ctx, userID)
	}
	return "", nil, nil
}

// ===== GetNextClass handler tests =====

func TestGetNextClassSuccess(t *testing.T) {
	gin.SetMode(gin.TestMode)
	item := &domain.ClassItem{
		ClassID:   "item-1",
		Type:      "lec",
		Section:   "AA",
		Day:       "Monday",
		StartTime: "09:00",
		EndTime:   "10:15",
		Room:      "H-937",
	}
	service := &fakeScheduleService{
		getNextClassFn: func(ctx context.Context, userID string) (string, *domain.ClassItem, error) {
			require.Equal(t, "user_1", userID)
			return "SOEN345", item, nil
		},
	}
	h := NewScheduleHandler(service)

	r := gin.New()
	r.GET("/users/:userId/courses/next", h.GetNextClass)

	req := httptest.NewRequest(http.MethodGet, "/users/user_1/courses/next", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	require.Equal(t, http.StatusOK, w.Code)
	var resp NextClassResponse
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &resp))
	require.Equal(t, "SOEN345", resp.ClassName)
	require.Equal(t, "Monday", resp.Item.Day)
	require.Equal(t, "09:00", resp.Item.StartTime)
	require.Equal(t, "H-937", resp.Item.Room)
}

func TestGetNextClassNotFound(t *testing.T) {
	gin.SetMode(gin.TestMode)
	service := &fakeScheduleService{
		getNextClassFn: func(ctx context.Context, userID string) (string, *domain.ClassItem, error) {
			return "", nil, nil
		},
	}
	h := NewScheduleHandler(service)

	r := gin.New()
	r.GET("/users/:userId/courses/next", h.GetNextClass)

	req := httptest.NewRequest(http.MethodGet, "/users/user_1/courses/next", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	require.Equal(t, http.StatusNotFound, w.Code)
}

func TestGetNextClassServiceError(t *testing.T) {
	gin.SetMode(gin.TestMode)
	service := &fakeScheduleService{
		getNextClassFn: func(ctx context.Context, userID string) (string, *domain.ClassItem, error) {
			return "", nil, errors.New("firestore unavailable")
		},
	}
	h := NewScheduleHandler(service)

	r := gin.New()
	r.GET("/users/:userId/courses/next", h.GetNextClass)

	req := httptest.NewRequest(http.MethodGet, "/users/user_1/courses/next", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	require.Equal(t, http.StatusInternalServerError, w.Code)
}
