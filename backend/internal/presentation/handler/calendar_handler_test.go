package handler

import (
	"bytes"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/works-on-my-machine-390/concordia-waze/internal/application"
	"github.com/works-on-my-machine-390/concordia-waze/internal/domain"
	"golang.org/x/oauth2"
)

// Mock implementations

type mockTokenStore struct {
	token     *oauth2.Token
	found     bool
	getErr    error
	deleteErr error
}

func (m *mockTokenStore) GetGoogleToken(ctx interface{}, userID string) (*oauth2.Token, bool, error) {
	return m.token, m.found, m.getErr
}

type mockCalendarService struct {
	syncErr error
}

func (m *mockCalendarService) SyncCalendarEvents(since time.Time, token *oauth2.Token) error {
	return m.syncErr
}

type mockFirebaseService struct {
	classTitles        []string
	classItems         []domain.ClassItem
	createClassErr     error
	getClassesErr      error
	deleteClassErr     error
	addClassItemErr    error
	getClassItemsErr   error
	deleteClassItemErr error
	updateClassItemErr error
}

func (m *mockFirebaseService) CreateClass(ctx interface{}, userID, title string) error {
	return m.createClassErr
}
func (m *mockFirebaseService) GetUserClasses(ctx interface{}, userID string) ([]string, error) {
	return m.classTitles, m.getClassesErr
}
func (m *mockFirebaseService) DeleteClass(ctx interface{}, userID, title string) error {
	return m.deleteClassErr
}
func (m *mockFirebaseService) AddClassItem(ctx interface{}, userID, title string, item domain.ClassItem) (string, error) {
	return "item123", m.addClassItemErr
}
func (m *mockFirebaseService) GetClassItems(ctx interface{}, userID, title string) ([]domain.ClassItem, error) {
	return m.classItems, m.getClassItemsErr
}
func (m *mockFirebaseService) DeleteClassItem(ctx interface{}, userID, title, classID string) error {
	return m.deleteClassItemErr
}
func (m *mockFirebaseService) UpdateClassItem(ctx interface{}, userID, title, classID string, updates map[string]interface{}) error {
	return m.updateClassItemErr
}

// Helper: setup a Gin context with userID
func setUserID(c *gin.Context, userID string) {
	c.Set("userID", userID)
}

func TestSyncCalendarEvents_Success(t *testing.T) {
	gin.SetMode(gin.TestMode)
	ts := &mockTokenStore{token: &oauth2.Token{}, found: true}
	cs := &mockCalendarService{}
	fs := &mockFirebaseService{}
	h := NewCalendarHandler(ts, cs, fs)

	router := gin.New()
	router.GET("/calendar/sync", func(c *gin.Context) {
		setUserID(c, "abc")
		h.SyncCalendarEvents(c)
	})

	req := httptest.NewRequest("GET", "/calendar/sync?since=2024-01-01", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code) // No response body, but should not fail
}

func TestSyncCalendarEvents_TokenNotFound(t *testing.T) {
	gin.SetMode(gin.TestMode)
	ts := &mockTokenStore{token: nil, found: false}
	cs := &mockCalendarService{}
	fs := &mockFirebaseService{}
	h := NewCalendarHandler(ts, cs, fs)

	router := gin.New()
	router.GET("/calendar/sync", func(c *gin.Context) {
		setUserID(c, "abc")
		h.SyncCalendarEvents(c)
	})

	req := httptest.NewRequest("GET", "/calendar/sync?since=2024-01-01", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	assert.Equal(t, http.StatusUnauthorized, w.Code)
	assert.Contains(t, w.Body.String(), "google auth required")
}

func TestSyncCalendarEvents_GetTokenError(t *testing.T) {
	gin.SetMode(gin.TestMode)
	ts := &mockTokenStore{token: nil, found: false, getErr: errors.New("fail")}
	cs := &mockCalendarService{}
	fs := &mockFirebaseService{}
	h := NewCalendarHandler(ts, cs, fs)

	router := gin.New()
	router.GET("/calendar/sync", func(c *gin.Context) {
		setUserID(c, "abc")
		h.SyncCalendarEvents(c)
	})

	req := httptest.NewRequest("GET", "/calendar/sync", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	assert.Equal(t, http.StatusInternalServerError, w.Code)
}

func TestSyncCalendarEvents_BadDate(t *testing.T) {
	gin.SetMode(gin.TestMode)
	ts := &mockTokenStore{token: &oauth2.Token{}, found: true}
	cs := &mockCalendarService{}
	fs := &mockFirebaseService{}
	h := NewCalendarHandler(ts, cs, fs)

	router := gin.New()
	router.GET("/calendar/sync", func(c *gin.Context) {
		setUserID(c, "abc")
		h.SyncCalendarEvents(c)
	})

	req := httptest.NewRequest("GET", "/calendar/sync?since=notadate", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	assert.Equal(t, http.StatusBadRequest, w.Code)
	assert.Contains(t, w.Body.String(), "Invalid date")
}

func TestSyncCalendarEvents_SyncError(t *testing.T) {
	gin.SetMode(gin.TestMode)
	ts := &mockTokenStore{token: &oauth2.Token{}, found: true}
	cs := &mockCalendarService{syncErr: errors.New("failed")}
	fs := &mockFirebaseService{}
	h := NewCalendarHandler(ts, cs, fs)

	router := gin.New()
	router.GET("/calendar/sync", func(c *gin.Context) {
		setUserID(c, "abc")
		h.SyncCalendarEvents(c)
	})

	req := httptest.NewRequest("GET", "/calendar/sync?since=2024-01-01", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	assert.Equal(t, http.StatusInternalServerError, w.Code)
	assert.Contains(t, w.Body.String(), "failed to fetch events")
}

// ----- CLASS HANDLER TESTS -----

func TestAddClass_Success(t *testing.T) {
	gin.SetMode(gin.TestMode)
	fs := &mockFirebaseService{}
	h := &CalendarHandler{firebaseService: fs}
	router := gin.New()
	router.POST("/classes", func(c *gin.Context) {
		setUserID(c, "user1")
		h.AddClass(c)
	})

	body := []byte(`{"title":"CS101"}`)
	req := httptest.NewRequest("POST", "/classes", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	assert.Equal(t, http.StatusOK, w.Code)
	assert.Contains(t, w.Body.String(), "class created")
}

func TestAddClass_MissingTitle(t *testing.T) {
	fs := &mockFirebaseService{}
	h := &CalendarHandler{firebaseService: fs}
	router := gin.New()
	router.POST("/classes", func(c *gin.Context) {
		setUserID(c, "user1")
		h.AddClass(c)
	})

	body := []byte(`{}`)
	req := httptest.NewRequest("POST", "/classes", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	assert.Equal(t, http.StatusBadRequest, w.Code)
	assert.Contains(t, w.Body.String(), "title required")
}

func TestAddClass_CreateFails(t *testing.T) {
	fs := &mockFirebaseService{createClassErr: errors.New("fail")}
	h := &CalendarHandler{firebaseService: fs}
	router := gin.New()
	router.POST("/classes", func(c *gin.Context) {
		setUserID(c, "user1")
		h.AddClass(c)
	})

	body := []byte(`{"title":"CS101"}`)
	req := httptest.NewRequest("POST", "/classes", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	assert.Equal(t, http.StatusInternalServerError, w.Code)
	assert.Contains(t, w.Body.String(), "failed to create class")
}

func TestGetClasses_Success(t *testing.T) {
	fs := &mockFirebaseService{classTitles: []string{"CS101", "MATH220"}}
	h := &CalendarHandler{firebaseService: fs}
	router := gin.New()
	router.GET("/classes", func(c *gin.Context) {
		setUserID(c, "user1")
		h.GetClasses(c)
	})

	req := httptest.NewRequest("GET", "/classes", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	assert.Equal(t, http.StatusOK, w.Code)
	assert.Contains(t, w.Body.String(), "CS101")
	assert.Contains(t, w.Body.String(), "MATH220")
}

func TestGetClasses_FetchFails(t *testing.T) {
	fs := &mockFirebaseService{getClassesErr: errors.New("fail")}
	h := &CalendarHandler{firebaseService: fs}
	router := gin.New()
	router.GET("/classes", func(c *gin.Context) {
		setUserID(c, "user1")
		h.GetClasses(c)
	})

	req := httptest.NewRequest("GET", "/classes", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	assert.Equal(t, http.StatusInternalServerError, w.Code)
}

func TestDeleteClass_Success(t *testing.T) {
	fs := &mockFirebaseService{}
	h := &CalendarHandler{firebaseService: fs}
	router := gin.New()
	router.DELETE("/classes/:title", func(c *gin.Context) {
		setUserID(c, "user1")
		c.Params = gin.Params{{Key: "title", Value: "CS101"}}
		h.DeleteClass(c)
	})

	req := httptest.NewRequest("DELETE", "/classes/CS101", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	assert.Equal(t, http.StatusOK, w.Code)
	assert.Contains(t, w.Body.String(), "class deleted")
}

func TestDeleteClass_MissingTitle(t *testing.T) {
	fs := &mockFirebaseService{}
	h := &CalendarHandler{firebaseService: fs}
	router := gin.New()
	router.DELETE("/classes/:title", func(c *gin.Context) {
		setUserID(c, "user1")
		h.DeleteClass(c)
	})

	req := httptest.NewRequest("DELETE", "/classes/", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	assert.Equal(t, http.StatusBadRequest, w.Code)
	assert.Contains(t, w.Body.String(), "class title required")
}

func TestDeleteClass_DeleteFails(t *testing.T) {
	fs := &mockFirebaseService{deleteClassErr: errors.New("fail")}
	h := &CalendarHandler{firebaseService: fs}
	router := gin.New()
	router.DELETE("/classes/:title", func(c *gin.Context) {
		setUserID(c, "user1")
		c.Params = gin.Params{{Key: "title", Value: "CS101"}}
		h.DeleteClass(c)
	})

	req := httptest.NewRequest("DELETE", "/classes/CS101", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	assert.Equal(t, http.StatusInternalServerError, w.Code)
	assert.Contains(t, w.Body.String(), "failed to delete class")
}

func TestDeleteClassItem_Success(t *testing.T) {
	fs := &mockFirebaseService{}
	h := &CalendarHandler{firebaseService: fs}
	router := gin.New()
	router.DELETE("/classes/:title/items/:classID", func(c *gin.Context) {
		setUserID(c, "user1")
		c.Params = gin.Params{{Key: "title", Value: "CS101"}, {Key: "classID", Value: "item123"}}
		h.DeleteClassItem(c)
	})

	req := httptest.NewRequest("DELETE", "/classes/CS101/items/item123", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	assert.Equal(t, http.StatusOK, w.Code)
	assert.Contains(t, w.Body.String(), "class item deleted")
}

func TestDeleteClassItem_MissingParams(t *testing.T) {
	fs := &mockFirebaseService{}
	h := &CalendarHandler{firebaseService: fs}
	router := gin.New()
	router.DELETE("/classes/:title/items/:classID", func(c *gin.Context) {
		setUserID(c, "user1")
		h.DeleteClassItem(c)
	})

	req := httptest.NewRequest("DELETE", "/classes/items/", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	assert.Equal(t, http.StatusBadRequest, w.Code)
	assert.Contains(t, w.Body.String(), "title and classID required")
}

func TestDeleteClassItem_DeleteFails(t *testing.T) {
	fs := &mockFirebaseService{deleteClassItemErr: errors.New("fail")}
	h := &CalendarHandler{firebaseService: fs}
	router := gin.New()
	router.DELETE("/classes/:title/items/:classID", func(c *gin.Context) {
		setUserID(c, "user1")
		c.Params = gin.Params{{Key: "title", Value: "CS101"}, {Key: "classID", Value: "item123"}}
		h.DeleteClassItem(c)
	})

	req := httptest.NewRequest("DELETE", "/classes/CS101/items/item123", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	assert.Equal(t, http.StatusInternalServerError, w.Code)
	assert.Contains(t, w.Body.String(), "failed to delete class item")
}

func TestGetClassItems_Success(t *testing.T) {
	item := domain.ClassItem{ClassID: "item123", Name: "Lecture"}
	fs := &mockFirebaseService{classItems: []domain.ClassItem{item}}
	h := &CalendarHandler{firebaseService: fs}
	router := gin.New()
	router.GET("/classes/:title/items", func(c *gin.Context) {
		setUserID(c, "user1")
		c.Params = gin.Params{{Key: "title", Value: "CS101"}}
		h.GetClassItems(c)
	})

	req := httptest.NewRequest("GET", "/classes/CS101/items", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	assert.Equal(t, http.StatusOK, w.Code)
	assert.Contains(t, w.Body.String(), "Lecture")
}

func TestGetClassItems_MissingTitle(t *testing.T) {
	fs := &mockFirebaseService{}
	h := &CalendarHandler{firebaseService: fs}
	router := gin.New()
	router.GET("/classes/:title/items", func(c *gin.Context) {
		setUserID(c, "user1")
		h.GetClassItems(c)
	})

	req := httptest.NewRequest("GET", "/classes/items/", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	assert.Equal(t, http.StatusBadRequest, w.Code)
	assert.Contains(t, w.Body.String(), "class title required")
}

func TestGetClassItems_FetchFails(t *testing.T) {
	fs := &mockFirebaseService{getClassItemsErr: errors.New("fail")}
	h := &CalendarHandler{firebaseService: fs}
	router := gin.New()
	router.GET("/classes/:title/items", func(c *gin.Context) {
		setUserID(c, "user1")
		c.Params = gin.Params{{Key: "title", Value: "CS101"}}
		h.GetClassItems(c)
	})

	req := httptest.NewRequest("GET", "/classes/CS101/items", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	assert.Equal(t, http.StatusInternalServerError, w.Code)
	assert.Contains(t, w.Body.String(), "failed to fetch class items")
}

func TestAddClassItem_Success(t *testing.T) {
	fs := &mockFirebaseService{}
	h := &CalendarHandler{firebaseService: fs}
	router := gin.New()
	router.POST("/classes/:title/items", func(c *gin.Context) {
		setUserID(c, "user1")
		c.Params = gin.Params{{Key: "title", Value: "CS101"}}
		h.AddClassItem(c)
	})

	item := domain.ClassItem{Name: "Lecture"}
	body, _ := json.Marshal(item)
	req := httptest.NewRequest("POST", "/classes/CS101/items", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	assert.Equal(t, http.StatusOK, w.Code)
	assert.Contains(t, w.Body.String(), "class item added")
	assert.Contains(t, w.Body.String(), "classID")
}

func TestAddClassItem_MissingTitle(t *testing.T) {
	fs := &mockFirebaseService{}
	h := &CalendarHandler{firebaseService: fs}
	router := gin.New()
	router.POST("/classes/:title/items", func(c *gin.Context) {
		setUserID(c, "user1")
		h.AddClassItem(c)
	})

	item := domain.ClassItem{Name: "Lecture"}
	body, _ := json.Marshal(item)
	req := httptest.NewRequest("POST", "/classes/items", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	assert.Equal(t, http.StatusBadRequest, w.Code)
	assert.Contains(t, w.Body.String(), "class title required")
}

func TestAddClassItem_BadJSON(t *testing.T) {
	fs := &mockFirebaseService{}
	h := &CalendarHandler{firebaseService: fs}
	router := gin.New()
	router.POST("/classes/:title/items", func(c *gin.Context) {
		setUserID(c, "user1")
		c.Params = gin.Params{{Key: "title", Value: "CS101"}}
		h.AddClassItem(c)
	})

	req := httptest.NewRequest("POST", "/classes/CS101/items", bytes.NewReader([]byte(`bad`)))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	assert.Equal(t, http.StatusBadRequest, w.Code)
	assert.Contains(t, w.Body.String(), "invalid class item")
}

func TestAddClassItem_AddFails(t *testing.T) {
	fs := &mockFirebaseService{addClassItemErr: errors.New("fail")}
	h := &CalendarHandler{firebaseService: fs}
	router := gin.New()
	router.POST("/classes/:title/items", func(c *gin.Context) {
		setUserID(c, "user1")
		c.Params = gin.Params{{Key: "title", Value: "CS101"}}
		h.AddClassItem(c)
	})

	item := domain.ClassItem{Name: "Lecture"}
	body, _ := json.Marshal(item)
	req := httptest.NewRequest("POST", "/classes/CS101/items", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	assert.Equal(t, http.StatusInternalServerError, w.Code)
	assert.Contains(t, w.Body.String(), "failed to add class item")
}

func TestUpdateClassItem_Success(t *testing.T) {
	fs := &mockFirebaseService{}
	h := &CalendarHandler{firebaseService: fs}
	router := gin.New()
	router.PATCH("/classes/:title/items/:classID", func(c *gin.Context) {
		setUserID(c, "user1")
		c.Params = gin.Params{{Key: "title", Value: "CS101"}, {Key: "classID", Value: "item123"}}
		h.UpdateClassItem(c)
	})

	updates := map[string]interface{}{"name": "Discussion"}
	body, _ := json.Marshal(updates)
	req := httptest.NewRequest("PATCH", "/classes/CS101/items/item123", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	assert.Equal(t, http.StatusOK, w.Code)
	assert.Contains(t, w.Body.String(), "class item updated")
}

func TestUpdateClassItem_MissingParams(t *testing.T) {
	fs := &mockFirebaseService{}
	h := &CalendarHandler{firebaseService: fs}
	router := gin.New()
	router.PATCH("/classes/:title/items/:classID", func(c *gin.Context) {
		setUserID(c, "user1")
		h.UpdateClassItem(c)
	})

	updates := map[string]interface{}{"name": "Discussion"}
	body, _ := json.Marshal(updates)
	req := httptest.NewRequest("PATCH", "/classes/items/item123", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	assert.Equal(t, http.StatusBadRequest, w.Code)
	assert.Contains(t, w.Body.String(), "title and classID required")
}

func TestUpdateClassItem_BadJSON(t *testing.T) {
	fs := &mockFirebaseService{}
	h := &CalendarHandler{firebaseService: fs}
	router := gin.New()
	router.PATCH("/classes/:title/items/:classID", func(c *gin.Context) {
		setUserID(c, "user1")
		c.Params = gin.Params{{Key: "title", Value: "CS101"}, {Key: "classID", Value: "item123"}}
		h.UpdateClassItem(c)
	})

	req := httptest.NewRequest("PATCH", "/classes/CS101/items/item123", bytes.NewReader([]byte(`bad`)))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	assert.Equal(t, http.StatusBadRequest, w.Code)
	assert.Contains(t, w.Body.String(), "updates required")
}

func TestUpdateClassItem_UpdateFails(t *testing.T) {
	fs := &mockFirebaseService{updateClassItemErr: errors.New("fail")}
	h := &CalendarHandler{firebaseService: fs}
	router := gin.New()
	router.PATCH("/classes/:title/items/:classID", func(c *gin.Context) {
		setUserID(c, "user1")
		c.Params = gin.Params{{Key: "title", Value: "CS101"}, {Key: "classID", Value: "item123"}}
		h.UpdateClassItem(c)
	})

	updates := map[string]interface{}{"name": "Discussion"}
	body, _ := json.Marshal(updates)
	req := httptest.NewRequest("PATCH", "/classes/CS101/items/item123", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	assert.Equal(t, http.StatusInternalServerError, w.Code)
	assert.Contains(t, w.Body.String(), "failed to update class item")
}
