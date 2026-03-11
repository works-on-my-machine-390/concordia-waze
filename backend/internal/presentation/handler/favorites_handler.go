package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/works-on-my-machine-390/concordia-waze/internal/domain"
	"github.com/works-on-my-machine-390/concordia-waze/internal/presentation/middleware"
)

// FavoritesService defines the operations used by the favorites handler
type FavoritesService interface {
	AddFavorite(userID, name string, latitude, longitude float64) (*domain.Favorite, error)
	GetFavorites(userID string) ([]*domain.Favorite, error)
	DeleteFavorite(id, userID string) error
}

// FavoritesHandler handles favorites endpoints
type FavoritesHandler struct {
	service FavoritesService
}

// NewFavoritesHandler creates a new favorites handler
func NewFavoritesHandler(service FavoritesService) *FavoritesHandler {
	return &FavoritesHandler{service: service}
}

// CreateFavoriteRequest is the request body for creating a favorite
type CreateFavoriteRequest struct {
	Name      string  `json:"name" binding:"required"`
	Latitude  float64 `json:"latitude"`
	Longitude float64 `json:"longitude"`
}

// resolveUserID derives the effective userID for a favorites request:
//   - Authenticated (JWT present): validates claims.ID == path :userId; returns ("", false) on mismatch.
//   - Anonymous (no JWT): ignores path :userId, returns ("", true) — routes to in-memory store.
func resolveUserID(c *gin.Context) (userID string, ok bool) {
	pathUserID := c.Param("userId")
	claims := middleware.GetUserFromContext(c)
	if claims != nil {
		if claims.ID != pathUserID {
			return "", false
		}
		return pathUserID, true
	}
	// Anonymous: effective userID is "" (in-memory store)
	return "", true
}

// CreateFavorite godoc
// @Summary Create a favorite
// @Description Save a favorite location for the given user. Works for both authenticated and anonymous users.
// @Tags favorites
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param userId path string true "User ID"
// @Param request body CreateFavoriteRequest true "Favorite location"
// @Success 201 {object} domain.Favorite
// @Failure 400 {object} map[string]string
// @Failure 403 {object} map[string]string "Token user does not match path user"
// @Router /users/{userId}/favorites [post]
func (h *FavoritesHandler) CreateFavorite(c *gin.Context) {
	userID, ok := resolveUserID(c)
	if !ok {
		c.JSON(http.StatusForbidden, gin.H{"error": "Access denied: token user does not match path user"})
		return
	}

	var req CreateFavoriteRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Please provide a valid name for the favorite"})
		return
	}

	favorite, err := h.service.AddFavorite(userID, req.Name, req.Latitude, req.Longitude)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, favorite)
}

// GetFavorites godoc
// @Summary List favorites
// @Description Get all favorite locations for the given user.
// @Tags favorites
// @Produce json
// @Security BearerAuth
// @Param userId path string true "User ID"
// @Success 200 {array} domain.Favorite
// @Failure 403 {object} map[string]string "Token user does not match path user"
// @Router /users/{userId}/favorites [get]
func (h *FavoritesHandler) GetFavorites(c *gin.Context) {
	userID, ok := resolveUserID(c)
	if !ok {
		c.JSON(http.StatusForbidden, gin.H{"error": "Access denied: token user does not match path user"})
		return
	}

	favorites, err := h.service.GetFavorites(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, favorites)
}

// DeleteFavorite godoc
// @Summary Delete a favorite
// @Description Delete a favorite location by ID for the given user.
// @Tags favorites
// @Produce json
// @Security BearerAuth
// @Param userId path string true "User ID"
// @Param id path string true "Favorite ID"
// @Success 200 {object} map[string]string
// @Failure 403 {object} map[string]string "Token user does not match path user"
// @Failure 404 {object} map[string]string "Favorite not found"
// @Router /users/{userId}/favorites/{id} [delete]
func (h *FavoritesHandler) DeleteFavorite(c *gin.Context) {
	userID, ok := resolveUserID(c)
	if !ok {
		c.JSON(http.StatusForbidden, gin.H{"error": "Access denied: token user does not match path user"})
		return
	}

	id := c.Param("id")
	if err := h.service.DeleteFavorite(id, userID); err != nil {
		if err == domain.ErrFavoriteNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "favorite deleted"})
}
