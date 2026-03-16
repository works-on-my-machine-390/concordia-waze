package handler

import (
	"errors"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/works-on-my-machine-390/concordia-waze/internal/application"
	"github.com/works-on-my-machine-390/concordia-waze/internal/domain"
)

type CalendarHandler struct {
	tokenStore      GoogleTokenStore
	calendarService application.CalendarService
	firebaseService application.FirebaseClassService
}

func NewCalendarHandler(tokenStore GoogleTokenStore, calendarService application.CalendarService, firebaseService application.FirebaseClassService) *CalendarHandler {
	return &CalendarHandler{
		tokenStore:      tokenStore,
		calendarService: calendarService,
		firebaseService: firebaseService,
	}
}

type query struct {
	Since      time.Time `form:"since" time_format:"2006-01-02" binding:"required"`
	CalendarID string    `form:"calendar_id"`
}

type SyncResponse struct {
	Events []domain.CourseItem `json:"events"`
	Errors []string            `json:"errors,omitempty"`
}

type createCourseRequest struct {
	Name string `json:"name" binding:"required"`
}

// SyncCalendarEvents godoc
// @Summary Sync Google Calendar events
// @Description Synchronizes Google Calendar events for the authenticated user since a given date
// @Tags class
// @Param since query string true "Sync events since this date (YYYY-MM-DD)"
// @Param calendar_id query string false "calendar id, default to primary"
// @Success 200 {string} string "Events synced successfully"
// @Failure 400 {object} map[string]string "Invalid date"
// @Failure 401 {object} map[string]string "Google auth required"
// @Failure 500 {object} map[string]string "Failed to fetch events or token"
// @Security    BearerAuth
// @Router /courses/sync [get]
func (h *CalendarHandler) SyncCalendarEvents(c *gin.Context) {

	userID := c.GetString("userID")

	token, found, err := h.tokenStore.GetGoogleToken(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to retrieve token"})
		return
	}
	if !found || token == nil {
		// Frontend should redirect to /auth/google
		c.JSON(http.StatusUnauthorized, gin.H{"error": "google auth required", "code": "AUTH_REQUIRED"})
		return
	}

	var q query
	if err := c.ShouldBindQuery(&q); err != nil {
		c.JSON(400, gin.H{"error": "Invalid date"})
		return
	}

	if q.CalendarID == "" {
		q.CalendarID = "primary"
	}

	if events, syncErrors, err := h.calendarService.SyncCalendarEvents(token, userID, q.Since, q.CalendarID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch events", "details": err.Error()})
		return
	} else {
		courses := make([]domain.CourseItem, 0, len(events))
		for course, event := range events {
			courses = append(courses, domain.CourseItem{
				Name:    course,
				Classes: event,
			})
		}

		c.JSON(http.StatusOK, SyncResponse{
			Events: courses,
			Errors: syncErrors,
		})
	}

}

// addCourse godoc
// @Summary Create a new class (container)
// @Description Creates a new class for the authenticated user
// @Tags class
// @Accept json
// @Produce json
// @Param class body createCourseRequest true "Class Title"
// @Success 200 {string} string "Created class"
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Security BearerAuth
// @Router /courses [post]
func (h *CalendarHandler) AddCourse(c *gin.Context) {
	userID := c.GetString("userID")
	var req createCourseRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body", "details": err.Error()})
		return
	}

	if err := h.firebaseService.CreateClass(c.Request.Context(), userID, req.Name); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"message": "course created"})
}

// GetCourses godoc
// @Summary List user classes
// @Description Retrieves all class titles for the authenticated user
// @Tags class
// @Produce json
// @Success 200 {array} string
// @Failure 500 {object} map[string]string
// @Security BearerAuth
// @Router /courses [get]
func (h *CalendarHandler) GetCourses(c *gin.Context) {
	userID := c.GetString("userID")
	ctx := c.Request.Context()

	titles, err := h.firebaseService.GetUserClasses(ctx, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	courses := make([]domain.CourseItem, 0, len(titles))
	for _, title := range titles {
		items, err := h.firebaseService.GetClassItems(ctx, userID, title)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		courses = append(courses, domain.CourseItem{
			Name:    title,
			Classes: items,
		})
	}

	c.JSON(http.StatusOK, courses)
}

// DeleteCourse godoc
// @Summary Delete a class and its items
// @Description Deletes a specified class for the authenticated user
// @Tags class
// @Param title path string true "Class title"
// @Success 200 {string} string
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Security BearerAuth
// @Router /courses/{title} [delete]
func (h *CalendarHandler) DeleteCourse(c *gin.Context) {
	userID := c.GetString("userID")
	title := c.Param("title")

	if err := h.firebaseService.DeleteClass(c.Request.Context(), userID, title); err != nil {
		if errors.Is(err, domain.ErrCourseNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "course deleted"})
}

// DeleteClassItem godoc
// @Summary Delete a single item from a class
// @Description Delete a specific class item from a user's class
// @Tags class
// @Param title path string true "Class title"
// @Param classID path string true "Class item ID"
// @Success 200 {string} string
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Security BearerAuth
// @Router /courses/{title}/items/{classID} [delete]
func (h *CalendarHandler) DeleteClassItem(c *gin.Context) {
	userID := c.GetString("userID")
	title := c.Param("title")
	classID := c.Param("classID")

	if err := h.firebaseService.DeleteClassItem(c.Request.Context(), userID, title, classID); err != nil {
		if errors.Is(err, domain.ErrCourseNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "class deleted"})
}

// GetClassItems godoc
// @Summary List items in a class
// @Description Lists schedule items in the given class
// @Tags class
// @Param title path string true "Class title"
// @Success 200 {array} domain.ClassItem
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Security BearerAuth
// @Router /courses/{title}/items [get]
func (h *CalendarHandler) GetClassItems(c *gin.Context) {
	userID := c.GetString("userID")
	title := c.Param("title")
	if title == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "class title required"})
		return
	}
	items, err := h.firebaseService.GetClassItems(c.Request.Context(), userID, title)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch class items"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"classItems": items})
}

// AddClassItem godoc
// @Summary Add a schedule item to a class
// @Description Add a new class item to an existing class
// @Tags class
// @Accept json
// @Produce json
// @Param title path string true "Class title"
// @Param item body domain.ClassItem true "Class Item"
// @Success 200 {string} string
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Security BearerAuth
// @Router /courses/{title}/items [post]
func (h *CalendarHandler) AddClassItem(c *gin.Context) {
	userID := c.GetString("userID")
	title := c.Param("title")

	var item domain.ClassItem
	if err := c.ShouldBindJSON(&item); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body", "details": err.Error()})
		return
	}

	classID, err := h.firebaseService.AddClassItem(c.Request.Context(), userID, title, item)
	if err != nil {
		if errors.Is(err, domain.ErrCourseNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"message": "class added", "classID": classID})
}

// UpdateClassItem godoc
// @Summary Update a class item (partial)
// @Description Update fields of a class item (PATCH semantics)
// @Tags class
// @Accept json
// @Produce json
// @Param title path string true "Class title"
// @Param classID path string true "Class item ID"
// @Param updates body map[string]interface{} true "Updates"
// @Success 200 {string} string
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Security BearerAuth
// @Router /courses/{title}/items/{classID} [patch]
func (h *CalendarHandler) UpdateClassItem(c *gin.Context) {
	userID := c.GetString("userID")
	title := c.Param("title")
	classID := c.Param("classID")

	var updates map[string]interface{}
	if err := c.ShouldBindJSON(&updates); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
		return
	}

	if err := h.firebaseService.UpdateClassItem(c.Request.Context(), userID, title, classID, updates); err != nil {
		if errors.Is(err, domain.ErrCourseNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "class updated"})
}
