package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/works-on-my-machine-390/concordia-waze/internal/application"
)

type PointOfInterestHandler struct {
	service application.PointOfInterestService
}

func NewPointOfInterestHandler(service application.PointOfInterestService) *PointOfInterestHandler {
	return &PointOfInterestHandler{service: service}
}

type GetPointsRequest struct {
	Input          string  `form:"input" binding:"required"`
	Lat            float64 `form:"lat" binding:"required"`
	Lng            float64 `form:"lng" binding:"required"`
	MaxDistance    int     `form:"max_distance"`
	RankPreference string  `form:"rank_preference"`
}

// @Summary     Get nearby points of interest
// @Description Get nearby points of interest via text search from Google Places API
// @Tags        point of interest
// @Accept      json
// @Produce     json
// @Param       input query string true "Search query (e.g., 'coffee shop')"
// @Param       lat query number true "Latitude of the location"
// @Param       lng query number true "Longitude of the location"
// @Param       maxDistanceInMeters query int false "Maximum distance in meters (default: 1000)"
// @Param       rankPreference query string false "Rank preference (e.g., 'DISTANCE', 'RELEVANCE'; default: 'DISTANCE')"
// @Success     200 {object} []domain.Building
// @Failure     400 {object} map[string]string "bad request"
// @Failure     500 {object} map[string]string "internal server error"
// @Router      /pointofinterest [get]
func (h *PointOfInterestHandler) GetNearbyPointsOfInterest(c *gin.Context) {
	var req GetPointsRequest

	if err := c.ShouldBindQuery(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Missing or invalid parameters: " + err.Error(),
		})
		return
	}
	pointsOfInterests, err := h.service.GetNearbyPointsOfInterest(
		req.Input,
		req.Lat,
		req.Lng,
		req.MaxDistance,
		req.RankPreference,
	)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": pointsOfInterests,
	})
}
