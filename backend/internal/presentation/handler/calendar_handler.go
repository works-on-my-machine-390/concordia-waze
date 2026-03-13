package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

type CalendarHandler struct {
	store GoogleTokenStore
}

func NewCalendarHandler(tokenStore GoogleTokenStore) *CalendarHandler {
	return &CalendarHandler{
		store: tokenStore,
	}
}

func (h *CalendarHandler) GetCalendarEvents(c *gin.Context) {
	v, ok := c.Get("userID")
	userID, isString := v.(string)

	if !ok || !isString || userID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "missing userId (query or from auth context)"})
		return
	}

	token, found, err := h.store.GetGoogleToken(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to retrieve token"})
		return
	}
	if !found || token == nil {
		// Frontend should redirect to /auth/google
		c.JSON(http.StatusUnauthorized, gin.H{"error": "google auth required", "code": "AUTH_REQUIRED"})
		return
	}

	//events, err := h.calendarService.ListEvents(c.Request.Context(), token)
	//if err != nil {
	//	c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch events"})
	//	return
	//}

}
