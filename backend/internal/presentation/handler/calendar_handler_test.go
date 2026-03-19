package handler

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/works-on-my-machine-390/concordia-waze/internal/domain"
	"golang.org/x/oauth2"
)

type mockTokenStore struct {
	token  *oauth2.Token
	found  bool
	getErr error
}

func (m *mockTokenStore) GetGoogleToken(ctx context.Context, userID string) (*oauth2.Token, bool, error) {
	return m.token, m.found, m.getErr
}

func (m *mockTokenStore) SaveGoogleToken(ctx context.Context, userID string, token *oauth2.Token) error {
	return nil
}

type mockCalendarService struct {
	events map[string][]*domain.ClassItem
	errs   []string
	err    error
}

func (m *mockCalendarService) SyncCalendarEvents(token *oauth2.Token, userID string, day time.Time, calendarID string) (map[string][]*domain.ClassItem, []string, error) {
	return m.events, m.errs, m.err
}

type mockFirebaseService struct {
	createClassErr      error
	getClassesErr       error
	deleteClassErr      error
	addClassItemErr     error
	getClassItemsErr    error
	deleteClassItemErr  error
	updateClassItemErr  error
	getAllClassItemsErr error

	classTitles   []string
	classItems    []*domain.ClassItem
	nextClassName string
	nextClassItem *domain.ClassItem
	nextClassErr  error
}

func (m *mockFirebaseService) CreateClass(ctx context.Context, userID, title string) error {
	return m.createClassErr
}

func (m *mockFirebaseService) GetUserClasses(ctx context.Context, userID string) ([]string, error) {
	return m.classTitles, m.getClassesErr
}

func (m *mockFirebaseService) DeleteClass(ctx context.Context, userID, title string) error {
	return m.deleteClassErr
}

func (m *mockFirebaseService) AddClassItem(ctx context.Context, userID, title string, item domain.ClassItem) (string, error) {
	return "item123", m.addClassItemErr
}

func (m *mockFirebaseService) GetClassItems(ctx context.Context, userID, title string) ([]*domain.ClassItem, error) {
	return m.classItems, m.getClassItemsErr
}

func (m *mockFirebaseService) GetAllClassItems(userID string) (map[string][]*domain.ClassItem, error) {
	if m.getAllClassItemsErr != nil {
		return nil, m.getAllClassItemsErr
	}
	return map[string][]*domain.ClassItem{}, nil
}

func (m *mockFirebaseService) UpdateClassItem(ctx context.Context, userID, title, classID string, updates map[string]interface{}) error {
	return m.updateClassItemErr
}

func (m *mockFirebaseService) DeleteClassItem(ctx context.Context, userID, title, classID string) error {
	return m.deleteClassItemErr
}

func (m *mockFirebaseService) GetNextClass(userID string) (string, *domain.ClassItem, error) {
	return m.nextClassName, m.nextClassItem, m.nextClassErr
}

func setupCalendarTestRouter(h *CalendarHandler) *gin.Engine {
	r := gin.New()
	r.GET("/courses/sync", func(c *gin.Context) {
		c.Set("userID", "u1")
		h.SyncCalendarEvents(c)
	})
	r.GET("/courses/next", func(c *gin.Context) {
		c.Set("userID", "u1")
		h.GetNextClass(c)
	})
	r.POST("/courses", func(c *gin.Context) {
		c.Set("userID", "u1")
		h.AddCourse(c)
	})
	r.GET("/courses", func(c *gin.Context) {
		c.Set("userID", "u1")
		h.GetCourses(c)
	})
	r.DELETE("/courses/:title", func(c *gin.Context) {
		c.Set("userID", "u1")
		h.DeleteCourse(c)
	})
	r.GET("/courses/:title/items", func(c *gin.Context) {
		c.Set("userID", "u1")
		h.GetClassItems(c)
	})
	r.POST("/courses/:title/items", func(c *gin.Context) {
		c.Set("userID", "u1")
		h.AddClassItem(c)
	})
	r.PATCH("/courses/:title/items/:classID", func(c *gin.Context) {
		c.Set("userID", "u1")
		h.UpdateClassItem(c)
	})
	r.DELETE("/courses/:title/items/:classID", func(c *gin.Context) {
		c.Set("userID", "u1")
		h.DeleteClassItem(c)
	})
	return r
}

func TestCalendarHandler_SyncCalendarEvents(t *testing.T) {
	gin.SetMode(gin.TestMode)

	t.Run("success", func(t *testing.T) {
		ts := &mockTokenStore{token: &oauth2.Token{}, found: true}
		cs := &mockCalendarService{
			events: map[string][]*domain.ClassItem{
				"SOEN 384": {
					{Type: "Lecture", Day: "MON", StartTime: "10:00", EndTime: "12:00"},
				},
			},
		}
		fs := &mockFirebaseService{}
		h := NewCalendarHandler(ts, cs, fs, nil, nil)
		r := setupCalendarTestRouter(h)

		req := httptest.NewRequest(http.MethodGet, "/courses/sync?since=2024-01-01", nil)
		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)

		require.Equal(t, http.StatusOK, w.Code)
		assert.Contains(t, w.Body.String(), "SOEN 384")
	})

	t.Run("token missing", func(t *testing.T) {
		ts := &mockTokenStore{found: false}
		h := NewCalendarHandler(ts, &mockCalendarService{}, &mockFirebaseService{}, nil, nil)
		r := setupCalendarTestRouter(h)

		req := httptest.NewRequest(http.MethodGet, "/courses/sync?since=2024-01-01", nil)
		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)

		require.Equal(t, http.StatusUnauthorized, w.Code)
		assert.Contains(t, w.Body.String(), "google auth required")
	})

	t.Run("invalid date", func(t *testing.T) {
		ts := &mockTokenStore{token: &oauth2.Token{}, found: true}
		h := NewCalendarHandler(ts, &mockCalendarService{}, &mockFirebaseService{}, nil, nil)
		r := setupCalendarTestRouter(h)

		req := httptest.NewRequest(http.MethodGet, "/courses/sync?since=bad", nil)
		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)

		require.Equal(t, http.StatusBadRequest, w.Code)
	})

	t.Run("sync service failure", func(t *testing.T) {
		ts := &mockTokenStore{token: &oauth2.Token{}, found: true}
		cs := &mockCalendarService{err: errors.New("sync failed")}
		h := NewCalendarHandler(ts, cs, &mockFirebaseService{}, nil, nil)
		r := setupCalendarTestRouter(h)

		req := httptest.NewRequest(http.MethodGet, "/courses/sync?since=2024-01-01", nil)
		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)

		require.Equal(t, http.StatusInternalServerError, w.Code)
		assert.Contains(t, w.Body.String(), "failed to fetch events")
	})
}

func TestCalendarHandler_CourseEndpoints(t *testing.T) {
	gin.SetMode(gin.TestMode)

	t.Run("add course success", func(t *testing.T) {
		h := NewCalendarHandler(&mockTokenStore{}, &mockCalendarService{}, &mockFirebaseService{}, nil, nil)
		r := setupCalendarTestRouter(h)

		req := httptest.NewRequest(http.MethodPost, "/courses", bytes.NewBufferString(`{"name":"SOEN 384"}`))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)

		require.Equal(t, http.StatusCreated, w.Code)
		assert.Contains(t, w.Body.String(), "course created")
	})

	t.Run("add course bad request", func(t *testing.T) {
		h := NewCalendarHandler(&mockTokenStore{}, &mockCalendarService{}, &mockFirebaseService{}, nil, nil)
		r := setupCalendarTestRouter(h)

		req := httptest.NewRequest(http.MethodPost, "/courses", bytes.NewBufferString(`{"name":}`))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)

		require.Equal(t, http.StatusBadRequest, w.Code)
	})

	t.Run("get courses success", func(t *testing.T) {
		fs := &mockFirebaseService{
			classTitles: []string{"SOEN 384"},
			classItems: []*domain.ClassItem{{
				ClassID:   "item123",
				Type:      "Lecture",
				Day:       "MON",
				StartTime: "10:00",
				EndTime:   "12:00",
			}},
		}
		h := NewCalendarHandler(&mockTokenStore{}, &mockCalendarService{}, fs, nil, nil)
		r := setupCalendarTestRouter(h)

		req := httptest.NewRequest(http.MethodGet, "/courses", nil)
		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)

		require.Equal(t, http.StatusOK, w.Code)
		var courses []domain.CourseItem
		require.NoError(t, json.Unmarshal(w.Body.Bytes(), &courses))
		require.Len(t, courses, 1)
		require.Equal(t, "SOEN 384", courses[0].Name)
	})

	t.Run("delete course not found", func(t *testing.T) {
		fs := &mockFirebaseService{deleteClassErr: domain.ErrCourseNotFound}
		h := NewCalendarHandler(&mockTokenStore{}, &mockCalendarService{}, fs, nil, nil)
		r := setupCalendarTestRouter(h)

		req := httptest.NewRequest(http.MethodDelete, "/courses/SOEN%20384", nil)
		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)

		require.Equal(t, http.StatusNotFound, w.Code)
	})
}

func TestCalendarHandler_ClassItemEndpoints(t *testing.T) {
	gin.SetMode(gin.TestMode)

	t.Run("get class items success", func(t *testing.T) {
		fs := &mockFirebaseService{classItems: []*domain.ClassItem{{ClassID: "item123", Type: "Lecture"}}}
		h := NewCalendarHandler(&mockTokenStore{}, &mockCalendarService{}, fs, nil, nil)
		r := setupCalendarTestRouter(h)

		req := httptest.NewRequest(http.MethodGet, "/courses/SOEN%20384/items", nil)
		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)

		require.Equal(t, http.StatusOK, w.Code)
		assert.Contains(t, w.Body.String(), "item123")
	})

	t.Run("add class item success", func(t *testing.T) {
		h := NewCalendarHandler(&mockTokenStore{}, &mockCalendarService{}, &mockFirebaseService{}, nil, nil)
		r := setupCalendarTestRouter(h)

		payload := `{"type":"Lecture","section":"N","day":"MON","startTime":"10:00","endTime":"12:00"}`
		req := httptest.NewRequest(http.MethodPost, "/courses/SOEN%20384/items", bytes.NewBufferString(payload))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)

		require.Equal(t, http.StatusCreated, w.Code)
		assert.Contains(t, w.Body.String(), "class added")
	})

	t.Run("update class item success", func(t *testing.T) {
		h := NewCalendarHandler(&mockTokenStore{}, &mockCalendarService{}, &mockFirebaseService{}, nil, nil)
		r := setupCalendarTestRouter(h)

		req := httptest.NewRequest(http.MethodPatch, "/courses/SOEN%20384/items/item123", bytes.NewBufferString(`{"room":"H-110"}`))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)

		require.Equal(t, http.StatusOK, w.Code)
		assert.Contains(t, w.Body.String(), "class updated")
	})

	t.Run("delete class item not found", func(t *testing.T) {
		fs := &mockFirebaseService{deleteClassItemErr: domain.ErrCourseNotFound}
		h := NewCalendarHandler(&mockTokenStore{}, &mockCalendarService{}, fs, nil, nil)
		r := setupCalendarTestRouter(h)

		req := httptest.NewRequest(http.MethodDelete, "/courses/SOEN%20384/items/item123", nil)
		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)

		require.Equal(t, http.StatusNotFound, w.Code)
	})
}

func TestCalendarHandler_ErrorBranches(t *testing.T) {
	gin.SetMode(gin.TestMode)

	t.Run("sync token store error -> 500", func(t *testing.T) {
		ts := &mockTokenStore{getErr: errors.New("store failure")}
		h := NewCalendarHandler(ts, &mockCalendarService{}, &mockFirebaseService{}, nil, nil)
		r := setupCalendarTestRouter(h)

		req := httptest.NewRequest(http.MethodGet, "/courses/sync?since=2024-01-01", nil)
		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)

		require.Equal(t, http.StatusInternalServerError, w.Code)
		assert.Contains(t, w.Body.String(), "failed to retrieve token")
	})

	t.Run("get courses GetUserClasses error -> 500", func(t *testing.T) {
		fs := &mockFirebaseService{getClassesErr: errors.New("list failure")}
		h := NewCalendarHandler(&mockTokenStore{}, &mockCalendarService{}, fs, nil, nil)
		r := setupCalendarTestRouter(h)

		req := httptest.NewRequest(http.MethodGet, "/courses", nil)
		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)

		require.Equal(t, http.StatusInternalServerError, w.Code)
		assert.Contains(t, w.Body.String(), "list failure")
	})

	t.Run("get courses GetClassItems error -> 500", func(t *testing.T) {
		fs := &mockFirebaseService{
			classTitles:      []string{"SOEN 384"},
			getClassItemsErr: errors.New("items failure"),
		}
		h := NewCalendarHandler(&mockTokenStore{}, &mockCalendarService{}, fs, nil, nil)
		r := setupCalendarTestRouter(h)

		req := httptest.NewRequest(http.MethodGet, "/courses", nil)
		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)

		require.Equal(t, http.StatusInternalServerError, w.Code)
		assert.Contains(t, w.Body.String(), "items failure")
	})

	t.Run("delete course internal error -> 500", func(t *testing.T) {
		fs := &mockFirebaseService{deleteClassErr: errors.New("delete failure")}
		h := NewCalendarHandler(&mockTokenStore{}, &mockCalendarService{}, fs, nil, nil)
		r := setupCalendarTestRouter(h)

		req := httptest.NewRequest(http.MethodDelete, "/courses/SOEN%20384", nil)
		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)

		require.Equal(t, http.StatusInternalServerError, w.Code)
		assert.Contains(t, w.Body.String(), "delete failure")
	})

	t.Run("delete class item internal error -> 500", func(t *testing.T) {
		fs := &mockFirebaseService{deleteClassItemErr: errors.New("delete item fail")}
		h := NewCalendarHandler(&mockTokenStore{}, &mockCalendarService{}, fs, nil, nil)
		r := setupCalendarTestRouter(h)

		req := httptest.NewRequest(http.MethodDelete, "/courses/SOEN%20384/items/item123", nil)
		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)

		require.Equal(t, http.StatusInternalServerError, w.Code)
		assert.Contains(t, w.Body.String(), "delete item fail")
	})

	t.Run("get class items missing title -> 400", func(t *testing.T) {
		// Request path with empty title segment. Gin will set param to empty string.
		h := NewCalendarHandler(&mockTokenStore{}, &mockCalendarService{}, &mockFirebaseService{}, nil, nil)
		r := setupCalendarTestRouter(h)

		req := httptest.NewRequest(http.MethodGet, "/courses//items", nil)
		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)

		// handler should return Bad Request for empty title
		require.Equal(t, http.StatusBadRequest, w.Code)
		assert.Contains(t, w.Body.String(), "class title required")
	})

	t.Run("add class item bad JSON -> 400", func(t *testing.T) {
		h := NewCalendarHandler(&mockTokenStore{}, &mockCalendarService{}, &mockFirebaseService{}, nil, nil)
		r := setupCalendarTestRouter(h)

		req := httptest.NewRequest(http.MethodPost, "/courses/SOEN%20384/items", bytes.NewBufferString(`{"type":`))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)

		require.Equal(t, http.StatusBadRequest, w.Code)
		assert.Contains(t, w.Body.String(), "invalid request body")
	})

	t.Run("add class item course not found -> 404", func(t *testing.T) {
		fs := &mockFirebaseService{addClassItemErr: domain.ErrCourseNotFound}
		h := NewCalendarHandler(&mockTokenStore{}, &mockCalendarService{}, fs, nil, nil)
		r := setupCalendarTestRouter(h)

		payload := `{"type":"Lecture","section":"N","day":"MON","startTime":"10:00","endTime":"12:00"}`
		req := httptest.NewRequest(http.MethodPost, "/courses/SOEN%20384/items", bytes.NewBufferString(payload))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)

		require.Equal(t, http.StatusNotFound, w.Code)
	})

	t.Run("add class item internal error -> 500", func(t *testing.T) {
		fs := &mockFirebaseService{addClassItemErr: errors.New("add internal")}
		h := NewCalendarHandler(&mockTokenStore{}, &mockCalendarService{}, fs, nil, nil)
		r := setupCalendarTestRouter(h)

		payload := `{"type":"Lecture","section":"N","day":"MON","startTime":"10:00","endTime":"12:00"}`
		req := httptest.NewRequest(http.MethodPost, "/courses/SOEN%20384/items", bytes.NewBufferString(payload))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)

		require.Equal(t, http.StatusInternalServerError, w.Code)
		assert.Contains(t, w.Body.String(), "add internal")
	})

	t.Run("update class item bad JSON -> 400", func(t *testing.T) {
		h := NewCalendarHandler(&mockTokenStore{}, &mockCalendarService{}, &mockFirebaseService{}, nil, nil)
		r := setupCalendarTestRouter(h)

		req := httptest.NewRequest(http.MethodPatch, "/courses/SOEN%20384/items/item123", bytes.NewBufferString(`{bad`))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)

		require.Equal(t, http.StatusBadRequest, w.Code)
		assert.Contains(t, w.Body.String(), "invalid request body")
	})

	t.Run("update class item not found -> 404", func(t *testing.T) {
		fs := &mockFirebaseService{updateClassItemErr: domain.ErrCourseNotFound}
		h := NewCalendarHandler(&mockTokenStore{}, &mockCalendarService{}, fs, nil, nil)
		r := setupCalendarTestRouter(h)

		req := httptest.NewRequest(http.MethodPatch, "/courses/SOEN%20384/items/item123", bytes.NewBufferString(`{"room":"R-1"}`))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)

		require.Equal(t, http.StatusNotFound, w.Code)
	})

	t.Run("update class item internal error -> 500", func(t *testing.T) {
		fs := &mockFirebaseService{updateClassItemErr: errors.New("update fail")}
		h := NewCalendarHandler(&mockTokenStore{}, &mockCalendarService{}, fs, nil, nil)
		r := setupCalendarTestRouter(h)

		req := httptest.NewRequest(http.MethodPatch, "/courses/SOEN%20384/items/item123", bytes.NewBufferString(`{"room":"R-1"}`))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)

		require.Equal(t, http.StatusInternalServerError, w.Code)
		assert.Contains(t, w.Body.String(), "update fail")
	})
}

func TestGetNextClass(t *testing.T) {
	gin.SetMode(gin.TestMode)

	t.Run("returns next class -> 200", func(t *testing.T) {
		item := &domain.ClassItem{Type: "lec", Day: "Monday", StartTime: "14:00", EndTime: "15:30"}
		fs := &mockFirebaseService{nextClassName: "COMP 202", nextClassItem: item}
		h := NewCalendarHandler(&mockTokenStore{}, &mockCalendarService{}, fs, nil, nil)
		r := setupCalendarTestRouter(h)

		req := httptest.NewRequest(http.MethodGet, "/courses/next", nil)
		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)

		require.Equal(t, http.StatusOK, w.Code)
		var resp NextClassResponse
		require.NoError(t, json.NewDecoder(w.Body).Decode(&resp))
		assert.Equal(t, "COMP 202", resp.ClassName)
		assert.Equal(t, "lec", resp.Item.Type)
	})

	t.Run("no class today -> 200 with message", func(t *testing.T) {
		fs := &mockFirebaseService{nextClassItem: nil}
		h := NewCalendarHandler(&mockTokenStore{}, &mockCalendarService{}, fs, nil, nil)
		r := setupCalendarTestRouter(h)

		req := httptest.NewRequest(http.MethodGet, "/courses/next", nil)
		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)

		require.Equal(t, http.StatusOK, w.Code)
		assert.Contains(t, w.Body.String(), "no more classes today")
	})

	t.Run("service error -> 500", func(t *testing.T) {
		fs := &mockFirebaseService{nextClassErr: errors.New("db error")}
		h := NewCalendarHandler(&mockTokenStore{}, &mockCalendarService{}, fs, nil, nil)
		r := setupCalendarTestRouter(h)

		req := httptest.NewRequest(http.MethodGet, "/courses/next", nil)
		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)

		require.Equal(t, http.StatusInternalServerError, w.Code)
		assert.Contains(t, w.Body.String(), "db error")
	})
}

// ===== GetNextClass enrichment mocks =====

type mockBuildingLookup struct {
	building *domain.Building
	err      error
}

func (m *mockBuildingLookup) GetBuilding(code string) (*domain.Building, error) {
	return m.building, m.err
}

type mockRoomLookup struct {
	rooms []domain.IndoorRoom
	err   error
}

func (m *mockRoomLookup) GetByBuilding(buildingCode string) ([]domain.IndoorRoom, error) {
	return m.rooms, m.err
}

func TestGetNextClass_Enrichment(t *testing.T) {
	gin.SetMode(gin.TestMode)

	baseItem := &domain.ClassItem{
		Type: "lec", Day: "Monday", StartTime: "14:00", EndTime: "15:30",
		BuildingCode: "H", Room: "H-937",
	}

	t.Run("building coords populated when lookup succeeds", func(t *testing.T) {
		fs := &mockFirebaseService{nextClassName: "SOEN384", nextClassItem: baseItem}
		bl := &mockBuildingLookup{building: &domain.Building{Latitude: 45.497, Longitude: -73.578}}
		h := NewCalendarHandler(&mockTokenStore{}, &mockCalendarService{}, fs, bl, nil)
		r := setupCalendarTestRouter(h)

		req := httptest.NewRequest(http.MethodGet, "/courses/next", nil)
		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)

		require.Equal(t, http.StatusOK, w.Code)
		var resp NextClassResponse
		require.NoError(t, json.NewDecoder(w.Body).Decode(&resp))
		assert.InDelta(t, 45.497, resp.BuildingLatitude, 0.001)
		assert.InDelta(t, -73.578, resp.BuildingLongitude, 0.001)
	})

	t.Run("building coords omitted when lookup fails", func(t *testing.T) {
		fs := &mockFirebaseService{nextClassName: "SOEN384", nextClassItem: baseItem}
		bl := &mockBuildingLookup{err: errors.New("not found")}
		h := NewCalendarHandler(&mockTokenStore{}, &mockCalendarService{}, fs, bl, nil)
		r := setupCalendarTestRouter(h)

		req := httptest.NewRequest(http.MethodGet, "/courses/next", nil)
		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)

		require.Equal(t, http.StatusOK, w.Code)
		var resp NextClassResponse
		require.NoError(t, json.NewDecoder(w.Body).Decode(&resp))
		assert.Zero(t, resp.BuildingLatitude)
		assert.Zero(t, resp.BuildingLongitude)
	})

	t.Run("floor and room coords populated when room matched", func(t *testing.T) {
		fs := &mockFirebaseService{nextClassName: "SOEN384", nextClassItem: baseItem}
		rl := &mockRoomLookup{rooms: []domain.IndoorRoom{
			{Room: "H-937", Floor: 9, Centroid: domain.IndoorPosition{X: 1.1, Y: 2.2}},
		}}
		h := NewCalendarHandler(&mockTokenStore{}, &mockCalendarService{}, fs, nil, rl)
		r := setupCalendarTestRouter(h)

		req := httptest.NewRequest(http.MethodGet, "/courses/next", nil)
		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)

		require.Equal(t, http.StatusOK, w.Code)
		var resp NextClassResponse
		require.NoError(t, json.NewDecoder(w.Body).Decode(&resp))
		require.NotNil(t, resp.FloorNumber)
		assert.Equal(t, 9, *resp.FloorNumber)
		require.NotNil(t, resp.RoomX)
		assert.InDelta(t, 1.1, *resp.RoomX, 0.001)
		require.NotNil(t, resp.RoomY)
		assert.InDelta(t, 2.2, *resp.RoomY, 0.001)
	})

	t.Run("floor and room coords omitted when room not in list", func(t *testing.T) {
		fs := &mockFirebaseService{nextClassName: "SOEN384", nextClassItem: baseItem}
		rl := &mockRoomLookup{rooms: []domain.IndoorRoom{
			{Room: "H-100", Floor: 1, Centroid: domain.IndoorPosition{X: 0, Y: 0}},
		}}
		h := NewCalendarHandler(&mockTokenStore{}, &mockCalendarService{}, fs, nil, rl)
		r := setupCalendarTestRouter(h)

		req := httptest.NewRequest(http.MethodGet, "/courses/next", nil)
		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)

		require.Equal(t, http.StatusOK, w.Code)
		var resp NextClassResponse
		require.NoError(t, json.NewDecoder(w.Body).Decode(&resp))
		assert.Nil(t, resp.FloorNumber)
		assert.Nil(t, resp.RoomX)
		assert.Nil(t, resp.RoomY)
	})

	t.Run("floor and room coords omitted when room lookup fails", func(t *testing.T) {
		fs := &mockFirebaseService{nextClassName: "SOEN384", nextClassItem: baseItem}
		rl := &mockRoomLookup{err: errors.New("lookup error")}
		h := NewCalendarHandler(&mockTokenStore{}, &mockCalendarService{}, fs, nil, rl)
		r := setupCalendarTestRouter(h)

		req := httptest.NewRequest(http.MethodGet, "/courses/next", nil)
		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)

		require.Equal(t, http.StatusOK, w.Code)
		var resp NextClassResponse
		require.NoError(t, json.NewDecoder(w.Body).Decode(&resp))
		assert.Nil(t, resp.FloorNumber)
	})

	t.Run("no enrichment when item has no building code", func(t *testing.T) {
		itemNoBldg := &domain.ClassItem{Type: "lec", Day: "Monday", StartTime: "14:00"}
		fs := &mockFirebaseService{nextClassName: "SOEN384", nextClassItem: itemNoBldg}
		bl := &mockBuildingLookup{building: &domain.Building{Latitude: 45.497, Longitude: -73.578}}
		rl := &mockRoomLookup{rooms: []domain.IndoorRoom{{Room: "H-937", Floor: 9}}}
		h := NewCalendarHandler(&mockTokenStore{}, &mockCalendarService{}, fs, bl, rl)
		r := setupCalendarTestRouter(h)

		req := httptest.NewRequest(http.MethodGet, "/courses/next", nil)
		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)

		require.Equal(t, http.StatusOK, w.Code)
		var resp NextClassResponse
		require.NoError(t, json.NewDecoder(w.Body).Decode(&resp))
		assert.Zero(t, resp.BuildingLatitude)
		assert.Nil(t, resp.FloorNumber)
	})
}
