package handler

import (
	"context"
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/works-on-my-machine-390/concordia-waze/internal/application"
	"github.com/works-on-my-machine-390/concordia-waze/internal/domain"
)

// FirebaseService defines the Firestore operations used by the handler.
type FirebaseService interface {
	CreateUserProfile(ctx context.Context, userID string, profile domain.User) error
	GetUserProfile(ctx context.Context, userID string) (*domain.User, error)

	AddScheduleItem(ctx context.Context, userID string, item application.ScheduleItem) (string, error)
	GetUserSchedule(ctx context.Context, userID string) ([]application.ScheduleItem, error)
	UpdateScheduleItem(ctx context.Context, userID, scheduleID string, updates map[string]interface{}) error
	DeleteScheduleItem(ctx context.Context, userID, scheduleID string) error
	AddSavedAddress(ctx context.Context, userID string, address application.SavedAddress) (string, error)
	GetSavedAddresses(ctx context.Context, userID string) ([]application.SavedAddress, error)
	UpdateSavedAddress(ctx context.Context, userID, addressID string, updates map[string]interface{}) error
	DeleteSavedAddress(ctx context.Context, userID, addressID string) error

	AddDestinationHistory(ctx context.Context, userID string, item application.DestinationHistoryItem) (string, error)
	GetDestinationHistory(ctx context.Context, userID string, limit int) ([]application.DestinationHistoryItem, error)
	ClearDestinationHistory(ctx context.Context, userID string) error
}

// FirebaseHandler handles Firestore-backed user endpoints.
type FirebaseHandler struct {
	service FirebaseService
}

// NewFirebaseHandler creates a new Firebase handler.
func NewFirebaseHandler(service FirebaseService) *FirebaseHandler {
	return &FirebaseHandler{service: service}
}

// ===== User Profile =====

// CreateUserProfile godoc
// @Summary Create user profile
// @Description Create or overwrite a user profile
// @Tags users
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param Authorization header string true "Bearer token"
// @Param userId path string true "User ID"
// @Param profile body domain.User true "User profile"
// @Success 201 {object} map[string]string
// @Failure 401 {object} map[string]string "Not authenticated"
// @Failure 403 {object} map[string]string "Forbidden"
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /users/{userId}/profile [post]
func (fh *FirebaseHandler) CreateUserProfile(c *gin.Context) {
	userID := c.Param("userId")
	var profile domain.User

	if err := c.ShouldBindJSON(&profile); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body for Create User Profile"})
		return
	}

	if err := fh.service.CreateUserProfile(c.Request.Context(), userID, profile); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"message": "user profile created"})
}

// GetUserProfile godoc
// @Summary Get user profile
// @Description Get a user profile by ID
// @Tags users
// @Produce json
// @Security BearerAuth
// @Param Authorization header string true "Bearer token"
// @Param userId path string true "User ID"
// @Success 200 {object} domain.User
// @Failure 401 {object} map[string]string "Not authenticated"
// @Failure 403 {object} map[string]string "Forbidden"
// @Failure 404 {object} map[string]string
// @Router /users/{userId}/profile [get]
func (fh *FirebaseHandler) GetUserProfile(c *gin.Context) {
	userID := c.Param("userId")
	profile, err := fh.service.GetUserProfile(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, profile)
}

// ===== Destination History =====

// AddDestinationHistory godoc
// @Summary Add destination history
// @Description Add a destination to a user's past destinations history
// @Tags history
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param Authorization header string true "Bearer token"
// @Param userId path string true "User ID"
// @Param item body application.DestinationHistoryItem true "Destination history item"
// @Success 201 {object} map[string]string
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /users/{userId}/history [post]
func (fh *FirebaseHandler) AddDestinationHistory(c *gin.Context) {
	userID := c.Param("userId")
	var item application.DestinationHistoryItem

	if err := c.ShouldBindJSON(&item); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "invalid request body for Add Destination History",
			"details": err.Error(),
		})
		return
	}

	item.DestinationType = strings.ToLower(strings.TrimSpace(item.DestinationType))
	if item.DestinationType != "building" && item.DestinationType != "poi" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": `invalid destinationType: expected "building" or "poi"`,
		})
		return
	}

	historyID, err := fh.service.AddDestinationHistory(c.Request.Context(), userID, item)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message":   "destination history added",
		"historyId": historyID,
	})
}

// GetDestinationHistory godoc
// @Summary Get destination history
// @Description Get a user's past destinations history (latest first)
// @Tags history
// @Produce json
// @Security BearerAuth
// @Param Authorization header string true "Bearer token"
// @Param userId path string true "User ID"
// @Param limit query int false "Limit results" default(50)
// @Success 200 {array} application.DestinationHistoryItem
// @Failure 500 {object} map[string]string
// @Router /users/{userId}/history [get]
func (fh *FirebaseHandler) GetDestinationHistory(c *gin.Context) {
	userID := c.Param("userId")
	limit := 50
	if limitParam := c.Query("limit"); limitParam != "" {
		if parsed, err := strconv.Atoi(limitParam); err == nil {
			limit = parsed
		}
	}

	history, err := fh.service.GetDestinationHistory(c.Request.Context(), userID, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, history)
}

// ClearDestinationHistory godoc
// @Summary Clear destination history
// @Description Delete all destination history items for a user (keeps _init placeholder)
// @Tags history
// @Produce json
// @Security BearerAuth
// @Param Authorization header string true "Bearer token"
// @Param userId path string true "User ID"
// @Success 200 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /users/{userId}/history [delete]
func (fh *FirebaseHandler) ClearDestinationHistory(c *gin.Context) {
	userID := c.Param("userId")

	if err := fh.service.ClearDestinationHistory(c.Request.Context(), userID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "destination history cleared"})
}

// ===== Schedule =====

// AddScheduleItem godoc
// @Summary Add schedule item
// @Description Add a schedule item for a user
// @Tags schedule
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param Authorization header string true "Bearer token"
// @Param userId path string true "User ID"
// @Param item body application.ScheduleItem true "Schedule item"
// @Success 201 {object} map[string]string
// @Failure 401 {object} map[string]string "Not authenticated"
// @Failure 403 {object} map[string]string "Forbidden"
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /users/{userId}/schedule [post]
func (fh *FirebaseHandler) AddScheduleItem(c *gin.Context) {
	userID := c.Param("userId")
	var item application.ScheduleItem

	if err := c.ShouldBindJSON(&item); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body for Add Schedule Item", "details": err.Error()})
		return
	}

	scheduleID, err := fh.service.AddScheduleItem(c.Request.Context(), userID, item)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"message": "schedule item added", "scheduleId": scheduleID})
}

// GetUserSchedule godoc
// @Summary Get user schedule
// @Description Get schedule items for a user
// @Tags schedule
// @Produce json
// @Security BearerAuth
// @Param Authorization header string true "Bearer token"
// @Param userId path string true "User ID"
// @Success 200 {array} application.ScheduleItem
// @Failure 401 {object} map[string]string "Not authenticated"
// @Failure 403 {object} map[string]string "Forbidden"
// @Failure 500 {object} map[string]string
// @Router /users/{userId}/schedule [get]
func (fh *FirebaseHandler) GetUserSchedule(c *gin.Context) {
	userID := c.Param("userId")

	schedule, err := fh.service.GetUserSchedule(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, schedule)
}

// UpdateScheduleItem godoc
// @Summary Update schedule item
// @Description Update a schedule item for a user
// @Tags schedule
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param Authorization header string true "Bearer token"
// @Param userId path string true "User ID"
// @Param scheduleId path string true "Schedule ID"
// @Param updates body map[string]interface{} true "Schedule updates"
// @Success 200 {object} map[string]string
// @Failure 401 {object} map[string]string "Not authenticated"
// @Failure 403 {object} map[string]string "Forbidden"
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /users/{userId}/schedule/{scheduleId} [put]
func (fh *FirebaseHandler) UpdateScheduleItem(c *gin.Context) {
	userID := c.Param("userId")
	scheduleID := c.Param("scheduleId")
	var updates map[string]interface{}

	if err := c.ShouldBindJSON(&updates); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body for Update Schedule Item"})
		return
	}

	if err := fh.service.UpdateScheduleItem(c.Request.Context(), userID, scheduleID, updates); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "schedule item updated"})
}

// DeleteScheduleItem godoc
// @Summary Delete schedule item
// @Description Delete a schedule item for a user
// @Tags schedule
// @Produce json
// @Security BearerAuth
// @Param Authorization header string true "Bearer token"
// @Param userId path string true "User ID"
// @Param scheduleId path string true "Schedule ID"
// @Success 200 {object} map[string]string
// @Failure 401 {object} map[string]string "Not authenticated"
// @Failure 403 {object} map[string]string "Forbidden"
// @Failure 500 {object} map[string]string
// @Router /users/{userId}/schedule/{scheduleId} [delete]
func (fh *FirebaseHandler) DeleteScheduleItem(c *gin.Context) {
	userID := c.Param("userId")
	scheduleID := c.Param("scheduleId")

	if err := fh.service.DeleteScheduleItem(c.Request.Context(), userID, scheduleID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "schedule item deleted"})
}

// ===== Saved Addresses =====

// AddSavedAddress godoc
// @Summary Add favorite
// @Description Add a favorite address for a user
// @Tags addresses
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param Authorization header string true "Bearer token"
// @Param userId path string true "User ID"
// @Param address body application.SavedAddress true "Saved address"
// @Success 201 {object} map[string]string
// @Failure 401 {object} map[string]string "Not authenticated"
// @Failure 403 {object} map[string]string "Forbidden"
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /users/{userId}/savedAddresses [post]
func (fh *FirebaseHandler) AddSavedAddress(c *gin.Context) {
	userID := c.Param("userId")
	var address application.SavedAddress

	if err := c.ShouldBindJSON(&address); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body", "details": err.Error()})
		return
	}

	addressID, err := fh.service.AddSavedAddress(c.Request.Context(), userID, address)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"message": "saved address added", "addressId": addressID})
}

// GetSavedAddresses godoc
// @Summary Get saved addresses
// @Description Get favorite addresses for a user
// @Tags addresses
// @Produce json
// @Security BearerAuth
// @Param Authorization header string true "Bearer token"
// @Param userId path string true "User ID"
// @Success 200 {array} application.SavedAddress
// @Failure 401 {object} map[string]string "Not authenticated"
// @Failure 403 {object} map[string]string "Forbidden"
// @Failure 500 {object} map[string]string
// @Router /users/{userId}/savedAddresses [get]
func (fh *FirebaseHandler) GetSavedAddresses(c *gin.Context) {
	userID := c.Param("userId")

	addresses, err := fh.service.GetSavedAddresses(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, addresses)
}

// UpdateSavedAddress godoc
// @Summary Update saved address
// @Description Update a saved address for a user
// @Tags addresses
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param Authorization header string true "Bearer token"
// @Param userId path string true "User ID"
// @Param addressId path string true "Address ID"
// @Param updates body map[string]interface{} true "Address updates"
// @Success 200 {object} map[string]string
// @Failure 401 {object} map[string]string "Not authenticated"
// @Failure 403 {object} map[string]string "Forbidden"
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /users/{userId}/savedAddresses/{addressId} [put]
func (fh *FirebaseHandler) UpdateSavedAddress(c *gin.Context) {
	userID := c.Param("userId")
	addressID := c.Param("addressId")
	var updates map[string]interface{}

	if err := c.ShouldBindJSON(&updates); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
		return
	}

	if err := fh.service.UpdateSavedAddress(c.Request.Context(), userID, addressID, updates); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "saved address updated"})
}

// DeleteSavedAddress godoc
// @Summary Delete saved address
// @Description Delete a saved address for a user
// @Tags addresses
// @Produce json
// @Security BearerAuth
// @Param Authorization header string true "Bearer token"
// @Param userId path string true "User ID"
// @Param addressId path string true "Address ID"
// @Success 200 {object} map[string]string
// @Failure 401 {object} map[string]string "Not authenticated"
// @Failure 403 {object} map[string]string "Forbidden"
// @Failure 500 {object} map[string]string
// @Router /users/{userId}/savedAddresses/{addressId} [delete]
func (fh *FirebaseHandler) DeleteSavedAddress(c *gin.Context) {
	userID := c.Param("userId")
	addressID := c.Param("addressId")

	if err := fh.service.DeleteSavedAddress(c.Request.Context(), userID, addressID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "saved address deleted"})
}
