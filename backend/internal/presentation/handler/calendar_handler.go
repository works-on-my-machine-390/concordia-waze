package handler

import (
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/works-on-my-machine-390/concordia-waze/internal/application"
	"github.com/works-on-my-machine-390/concordia-waze/internal/domain"
)

type CalendarHandler struct {
	tokenStore      GoogleTokenStore
	calendarService application.CalendarService
	firebaseService *application.FirebaseService
}

func NewCalendarHandler(tokenStore GoogleTokenStore, calendarService application.CalendarService, firebaseService *application.FirebaseService) *CalendarHandler {
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
	Events map[string][]*domain.ClassItem `json:"events"`
	Errors []string                       `json:"errors,omitempty"`
}

type AddClassRequest struct {
	Title string `json:"title" binding:"required"`
}

// SyncCalendarEvents godoc
// @Summary Sync Google Calendar events
// @Description Synchronizes Google Calendar events for the authenticated user since a given date
// @Tags calendar
// @Param since query string true "Sync events since this date (YYYY-MM-DD)"
// @Param calendar_id query string false "calendar id, default to primary"
// @Success 200 {string} string "Events synced successfully"
// @Failure 400 {object} map[string]string "Invalid date"
// @Failure 401 {object} map[string]string "Google auth required"
// @Failure 500 {object} map[string]string "Failed to fetch events or token"
// @Security    BearerAuth
// @Router /calendar/sync [get]
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

	events, errors, err2 := h.calendarService.SyncCalendarEvents(token, userID, q.Since, q.CalendarID)

	if err2 != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch events", "details": err2.Error()})
		return
	}

	c.JSON(http.StatusOK, SyncResponse{
		Events: events,
		Errors: errors,
	})

}

// AddClass godoc
// @Summary Create a new class (container)
// @Description Creates a new class for the authenticated user
// @Tags class
// @Accept json
// @Produce json
// @Param class body AddClassRequest true "Class Title"
// @Success 200 {string} string "Created class"
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Security BearerAuth
// @Router /classes [post]
func (h *CalendarHandler) AddClass(c *gin.Context) {
	userID := c.GetString("userID")
	var req AddClassRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "title required"})
		return
	}
	err := h.firebaseService.CreateClass(c.Request.Context(), userID, req.Title)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create class"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "class created"})
}

// GetClasses godoc
// @Summary List user classes
// @Description Retrieves all class titles for the authenticated user
// @Tags class
// @Produce json
// @Success 200 {array} string
// @Failure 500 {object} map[string]string
// @Security BearerAuth
// @Router /classes [get]
func (h *CalendarHandler) GetClasses(c *gin.Context) {
	userID := c.GetString("userID")
	classes, err := h.firebaseService.GetUserClasses(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch classes"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"classes": classes})
}

// DeleteClass godoc
// @Summary Delete a class and its items
// @Description Deletes a specified class for the authenticated user
// @Tags class
// @Param title path string true "Class title"
// @Success 200 {string} string
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Security BearerAuth
// @Router /classes/{title} [delete]
func (h *CalendarHandler) DeleteClass(c *gin.Context) {
	userID := c.GetString("userID")
	title := c.Param("title")
	if title == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "class title required"})
		return
	}
	err := h.firebaseService.DeleteClass(c.Request.Context(), userID, title)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to delete class"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "class deleted"})
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
// @Router /classes/{title}/items/{classID} [delete]
func (h *CalendarHandler) DeleteClassItem(c *gin.Context) {
	userID := c.GetString("userID")
	title := c.Param("title")
	classID := c.Param("classID")
	if title == "" || classID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "title and classID required"})
		return
	}
	err := h.firebaseService.DeleteClassItem(c.Request.Context(), userID, title, classID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to delete class item"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "class item deleted"})
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
// @Router /classes/{title}/items [get]
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
// @Router /classes/{title}/items [post]
func (h *CalendarHandler) AddClassItem(c *gin.Context) {
	userID := c.GetString("userID")
	title := c.Param("title")
	if title == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "class title required"})
		return
	}
	var item domain.ClassItem
	if err := c.ShouldBindJSON(&item); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid class item"})
		return
	}
	id, err := h.firebaseService.AddClassItem(c.Request.Context(), userID, title, item)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to add class item"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "class item added", "classID": id})
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
// @Router /classes/{title}/items/{classID} [patch]
func (h *CalendarHandler) UpdateClassItem(c *gin.Context) {
	userID := c.GetString("userID")
	title := c.Param("title")
	classID := c.Param("classID")
	if title == "" || classID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "title and classID required"})
		return
	}
	var updates map[string]interface{}
	if err := c.ShouldBindJSON(&updates); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "updates required"})
		return
	}
	err := h.firebaseService.UpdateClassItem(c.Request.Context(), userID, title, classID, updates)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update class item"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "class item updated"})
}
