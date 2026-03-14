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
}

func NewCalendarHandler(tokenStore GoogleTokenStore, calendarService application.CalendarService) *CalendarHandler {
	return &CalendarHandler{
		tokenStore:      tokenStore,
		calendarService: calendarService,
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

	fmt.Println("handler")
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

// GetCalendarEvents godoc
// @Summary Get Google Calendar events
// @Description Retrieves Google Calendar events for the authenticated user
// @Tags calendar
// @Success 200 {array} object "List of calendar events"
// @Failure 401 {object} map[string]string "Google auth required"
// @Failure 500 {object} map[string]string "Failed to fetch events"
// @Security    BearerAuth
// @Router /calendar [get]
func (h *CalendarHandler) GetCalendarEvents(c *gin.Context) {
	// userID := c.GetString("userID") // Unused, commented out
	//events, err := h.calendarService.getEvents(q.Since, token)
	//if err != nil {
	//	c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch events"})
	//	return
	//}
}

// DeleteCalendarEvents godoc
// @Summary Delete Google Calendar events
// @Description Deletes Google Calendar events for the authenticated user
// @Tags calendar
// @Success 200 {string} string "Events deleted successfully"
// @Failure 401 {object} map[string]string "Google auth required"
// @Failure 500 {object} map[string]string "Failed to delete events"
// @Security    BearerAuth
// @Router /calendar [delete]
func (h *CalendarHandler) DeleteCalendarEvents(c *gin.Context) {
	// userID := c.GetString("userID") // Unused, commented out
	//events, err := h.calendarService.deleteCalendarEvents(userID)
	//if err != nil {
	//	c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch events"})
	//	return
	//}
}

// AddCalendarEvents godoc
// @Summary Add Google Calendar events
// @Description Adds new Google Calendar events for the authenticated user
// @Tags calendar
// @Accept json
// @Produce json
// @Param event body object true "Event to add"
// @Success 200 {string} string "Event added successfully"
// @Failure 401 {object} map[string]string "Google auth required"
// @Failure 500 {object} map[string]string "Failed to add event"
// @Security    BearerAuth
// @Router /calendar [post]
func (h *CalendarHandler) AddCalendarEvents(c *gin.Context) {
	// userID := c.GetString("userID") // Unused, commented out
	//events, err := h.calendarService.addCalendarEvents(userID)
	//if err != nil {
	//	c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch events"})
	//	return
	//}
}
