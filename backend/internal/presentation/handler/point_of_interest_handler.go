package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/works-on-my-machine-390/concordia-waze/internal/application"
)

type PointOfInterestHandler struct {
	service          application.PointOfInterestGetter
	indoorPOIService application.IndoorPointOfInterestGetter
}

func NewPointOfInterestHandler(
	service application.PointOfInterestGetter,
	indoorPOIService application.IndoorPointOfInterestGetter,
) *PointOfInterestHandler {
	return &PointOfInterestHandler{
		service:          service,
		indoorPOIService: indoorPOIService,
	}
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
// @Param       max_distance query int false "Maximum distance in meters (default: 1000)"
// @Param       rank_preference query string false "Rank preference (e.g., 'DISTANCE', 'RELEVANCE'; default: 'DISTANCE')"
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

	c.JSON(http.StatusOK, gin.H{"data": pointsOfInterests})
}

type GetIndoorPOIsRequest struct {
	Building  string   `form:"building" binding:"required"`
	Floor     *int     `form:"floor" binding:"required"` // pointer fixes floor=0
	X         *float64 `form:"x" binding:"required"`
	Y         *float64 `form:"y" binding:"required"`
	Radius    int      `form:"radius"`
	SameFloor *bool    `form:"sameFloor"`
	Limit     int      `form:"limit"`
}

// @Summary     Get nearby indoor POIs
// @Description Returns indoor POIs near a given indoor position (projected coords).
// @Tags        point of interest
// @Produce     json
// @Param       building query string true "Building code (e.g., MB, LB, CC, VL)"
// @Param       floor query int true "Floor number"
// @Param       x query number true "Indoor X coordinate (EPSG:32198 meters)"
// @Param       y query number true "Indoor Y coordinate (EPSG:32198 meters)"
// @Param       radius query int false "Radius in meters (default: 40)"
// @Param       sameFloor query bool false "Filter to same floor (default: true)"
// @Param       limit query int false "Max results (default: 30)"
// @Success     200 {object} map[string]any
// @Failure     400 {object} map[string]string "bad request"
// @Failure     500 {object} map[string]string "internal server error"
// @Router      /pointofinterest/indoor [get]
func (h *PointOfInterestHandler) GetNearbyIndoorPOIs(c *gin.Context) {
	var req GetIndoorPOIsRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Missing or invalid parameters: " + err.Error(),
		})
		return
	}

	sameFloor := true
	if req.SameFloor != nil {
		sameFloor = *req.SameFloor
	}

	pois, err := h.indoorPOIService.GetNearbyIndoorPOIs(
		req.Building,
		*req.Floor,
		*req.X,
		*req.Y,
		req.Radius,
		sameFloor,
		req.Limit,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": pois})
}
