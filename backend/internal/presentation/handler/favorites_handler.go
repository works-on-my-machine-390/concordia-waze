package handler

import (
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/works-on-my-machine-390/concordia-waze/internal/domain"
	"github.com/works-on-my-machine-390/concordia-waze/internal/presentation/middleware"
)

// FavoritesService defines the operations used by the favorites handler
type FavoritesService interface {
	AddFavorite(fav *domain.Favorite) (*domain.Favorite, error)
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

// CreateFavoriteRequest is the request body for creating a favorite.
//
// Outdoor example:
//
//	{"type":"outdoor","name":"Hall Entrance","latitude":45.4971,"longitude":-73.5789}
//
// Indoor example:
//
//	{"type":"indoor","name":"Room 281","buildingCode":"H","floorNumber":2,"x":0.8749,"y":0.4326,"poiType":"room"}
//
// Backward compatibility: if "type" is omitted the request is treated as an outdoor favorite.
type CreateFavoriteRequest struct {
	Type      string  `json:"type"`
	Name      string  `json:"name" binding:"required"`
	Latitude  float64 `json:"latitude"`
	Longitude float64 `json:"longitude"`

	// Indoor-specific fields. Pointer types allow the handler to distinguish
	// "field not provided" from "field provided as zero".
	BuildingCode string   `json:"buildingCode"`
	FloorNumber  *int     `json:"floorNumber"`
	X            *float64 `json:"x"`
	Y            *float64 `json:"y"`
	PoiType      string   `json:"poiType"`
}

// resolveUserID derives the effective userID for a favorites request:
//   - Authenticated (JWT present): validates claims.ID == path :userId; returns ("", false) on mismatch.
//   - Anonymous (no JWT): uses path :userId directly, enabling Firestore persistence without auth.
func resolveUserID(c *gin.Context) (userID string, ok bool) {
	pathUserID := c.Param("userId")
	claims := middleware.GetUserFromContext(c)
	if claims != nil {
		if claims.ID != pathUserID {
			log.Printf("[favorites] auth mismatch: token user=%q path user=%q", claims.ID, pathUserID)
			return "", false
		}
		log.Printf("[favorites] authenticated request for user=%q", pathUserID)
		return pathUserID, true
	}
	// No JWT: use path userId directly so Firestore is reached when Firebase is enabled.
	log.Printf("[favorites] anonymous request using path user=%q", pathUserID)
	return pathUserID, true
}

// CreateFavorite godoc
// @Summary      Create a favorite
// @Description  Save a named location as a favorite for the given user. Supports both outdoor (lat/lng) and indoor (building/floor/x/y) favorites. If "type" is omitted the request is treated as outdoor for backward compatibility. Authenticated users' favorites are persisted in Firestore; anonymous requests are kept in memory.
// @Tags         favorites
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        userId   path      string                true  "User ID"
// @Param        request  body      CreateFavoriteRequest true  "Favorite location"
// @Success      201      {object}  domain.Favorite
// @Failure      400      {object}  map[string]string     "Missing or invalid fields"
// @Failure      403      {object}  map[string]string     "JWT user does not match path userId"
// @Router       /users/{userId}/favorites [post]
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

	// Backward-compatible type inference: missing type → outdoor
	favType := domain.FavoriteType(req.Type)
	if favType == "" {
		favType = domain.FavoriteTypeOutdoor
	}

	fav := &domain.Favorite{
		UserID: userID,
		Type:   favType,
		Name:   req.Name,
	}

	switch favType {
	case domain.FavoriteTypeOutdoor:
		if req.Latitude == 0 && req.Longitude == 0 {
			c.JSON(http.StatusBadRequest, gin.H{"error": domain.ErrOutdoorMissingCoords.Error()})
			return
		}
		fav.Latitude = req.Latitude
		fav.Longitude = req.Longitude

	case domain.FavoriteTypeIndoor:
		if req.BuildingCode == "" || req.FloorNumber == nil || req.X == nil || req.Y == nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": domain.ErrIndoorMissingFields.Error()})
			return
		}
		fav.BuildingCode = req.BuildingCode
		fav.FloorNumber = *req.FloorNumber
		fav.X = *req.X
		fav.Y = *req.Y
		fav.PoiType = req.PoiType

	default:
		c.JSON(http.StatusBadRequest, gin.H{"error": domain.ErrInvalidFavoriteType.Error()})
		return
	}

	log.Printf("[favorites] CreateFavorite user=%q type=%q name=%q", userID, favType, req.Name)
	result, err := h.service.AddFavorite(fav)
	if err != nil {
		log.Printf("[favorites] CreateFavorite error user=%q: %v", userID, err)
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	log.Printf("[favorites] CreateFavorite success user=%q id=%q", userID, result.ID)
	c.JSON(http.StatusCreated, result)
}

// GetFavorites godoc
// @Summary      List favorites
// @Description  Retrieve all saved favorite locations for the given user. Returns an empty array when no favorites exist.
// @Tags         favorites
// @Produce      json
// @Security     BearerAuth
// @Param        userId  path      string           true  "User ID"
// @Success      200     {array}   domain.Favorite
// @Failure      403     {object}  map[string]string  "JWT user does not match path userId"
// @Router       /users/{userId}/favorites [get]
func (h *FavoritesHandler) GetFavorites(c *gin.Context) {
	userID, ok := resolveUserID(c)
	if !ok {
		c.JSON(http.StatusForbidden, gin.H{"error": "Access denied: token user does not match path user"})
		return
	}

	log.Printf("[favorites] GetFavorites user=%q", userID)
	favorites, err := h.service.GetFavorites(userID)
	if err != nil {
		log.Printf("[favorites] GetFavorites error user=%q: %v", userID, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	log.Printf("[favorites] GetFavorites user=%q returned %d items", userID, len(favorites))
	c.JSON(http.StatusOK, favorites)
}

// DeleteFavorite godoc
// @Summary      Delete a favorite
// @Description  Remove a saved favorite location by ID. Authenticated users may only delete their own favorites (403 on mismatch). Returns 404 if the favorite does not exist.
// @Tags         favorites
// @Produce      json
// @Security     BearerAuth
// @Param        userId  path      string            true  "User ID"
// @Param        id      path      string            true  "Favorite ID"
// @Success      200     {object}  map[string]string  "favorite deleted"
// @Failure      403     {object}  map[string]string  "JWT user does not match path userId"
// @Failure      404     {object}  map[string]string  "Favorite not found"
// @Router       /users/{userId}/favorites/{id} [delete]
func (h *FavoritesHandler) DeleteFavorite(c *gin.Context) {
	userID, ok := resolveUserID(c)
	if !ok {
		c.JSON(http.StatusForbidden, gin.H{"error": "Access denied: token user does not match path user"})
		return
	}

	id := c.Param("id")
	log.Printf("[favorites] DeleteFavorite user=%q id=%q", userID, id)
	if err := h.service.DeleteFavorite(id, userID); err != nil {
		log.Printf("[favorites] DeleteFavorite error user=%q id=%q: %v", userID, id, err)
		if err == domain.ErrFavoriteNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		}
		return
	}

	log.Printf("[favorites] DeleteFavorite success user=%q id=%q", userID, id)
	c.JSON(http.StatusOK, gin.H{"message": "favorite deleted"})
}
