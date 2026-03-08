package handler

import (
	"github.com/gin-gonic/gin"

	"github.com/works-on-my-machine-390/concordia-waze/internal/application"
	"github.com/works-on-my-machine-390/concordia-waze/internal/domain/request_format"
)

type DirectionsHandler struct {
	directions application.DirectionsRedirectorService
}

func NewDirectionsHandler(directions application.DirectionsRedirectorService) *DirectionsHandler {
	return &DirectionsHandler{
		directions: directions,
	}
}

// GetFullDirections godoc
// @Summary      Get directions between coordinates, adapts between indoor/outdoor as needed
// @Description  Returns list of routes polyline + step instructions (walking/driving/transit/shuttle/bicycling)
// @Tags         directions
// @Accept       json
// @Produce      json
// @Param        body body request_format.RouteRequest true "Route request with start/end locations and preferences"
// @Success      200 {object} []domain.DirectionsResponse
// @Failure      400 {object} map[string]string
// @Router       /directions [post]
func (h *DirectionsHandler) GetFullDirections(c *gin.Context) {
	var req *request_format.RouteRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": "Invalid request format", "details": err.Error()})
		return
	}

	if req.Preferences.Mode == nil || len(req.Preferences.Mode) == 0 {
		req.Preferences.Mode = []string{"walking", "driving", "transit", "shuttle", "bicycling"}
	}

	result, err := h.directions.GetFullDirections(req)
	if err != nil {
		c.JSON(400, gin.H{"error": "Could not process request", "details": err.Error()})
		return
	}

	c.JSON(200, result)
}
