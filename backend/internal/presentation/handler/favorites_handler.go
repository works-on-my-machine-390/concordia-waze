package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/works-on-my-machine-390/concordia-waze/internal/domain"
)

// FavoritesService defines the operations used by the favorites handler
type FavoritesService interface {
	AddFavorite(userID, name string, latitude, longitude float64) (*domain.Favorite, error)
	GetFavorites(userID string) ([]*domain.Favorite, error)
	DeleteFavorite(id string) error
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
	UserID    string  `json:"userId"`
	Name      string  `json:"name" binding:"required"`
	Latitude  float64 `json:"latitude"`
	Longitude float64 `json:"longitude"`
}

// CreateFavorite godoc
// @Summary Create a favorite
// @Description Save a favorite location. userId is a client-provided identifier (e.g. device UUID).
// @Tags favorites
// @Accept json
// @Produce json
// @Param request body CreateFavoriteRequest true "Favorite location"
// @Success 201 {object} domain.Favorite
// @Failure 400 {object} map[string]string
// @Router /favorites [post]
func (h *FavoritesHandler) CreateFavorite(c *gin.Context) {
	var req CreateFavoriteRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	favorite, err := h.service.AddFavorite(req.UserID, req.Name, req.Latitude, req.Longitude)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, favorite)
}

// GetFavorites godoc
// @Summary List favorites
// @Description Get all favorite locations for the given userId query parameter.
// @Tags favorites
// @Produce json
// @Param userId query string false "Client-provided user identifier"
// @Success 200 {array} domain.Favorite
// @Router /favorites [get]
func (h *FavoritesHandler) GetFavorites(c *gin.Context) {
	userID := c.Query("userId")

	favorites, err := h.service.GetFavorites(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, favorites)
}

// DeleteFavorite godoc
// @Summary Delete a favorite
// @Description Delete a favorite location by ID
// @Tags favorites
// @Produce json
// @Param id path string true "Favorite ID"
// @Success 200 {object} map[string]string
// @Failure 404 {object} map[string]string "Favorite not found"
// @Router /favorites/{id} [delete]
func (h *FavoritesHandler) DeleteFavorite(c *gin.Context) {
	id := c.Param("id")
	if err := h.service.DeleteFavorite(id); err != nil {
		if err == domain.ErrFavoriteNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "favorite deleted"})
}
