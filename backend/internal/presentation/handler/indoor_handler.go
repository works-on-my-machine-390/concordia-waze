package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/works-on-my-machine-390/concordia-waze/internal/application"
)

type IndoorPathHandler struct {
	svc *application.IndoorPathService
}

func NewIndoorPathHandler(svc *application.IndoorPathService) *IndoorPathHandler {
	return &IndoorPathHandler{svc: svc}
}

// GetMultiFloorShortestPath godoc
// @Summary      Get indoor path across floors
// @Description  Returns shortest path from a point on one floor to a point on another floor (or same floor). Supports room names or raw coordinates. Uses stairs by default, set preferElevator=true for elevator.
// @Tags         directions
// @Accept       json
// @Produce      json
// @Param        body body application.MultiFloorPathRequest true "Path request with building, floors, and start/end points"
// @Success      200 {object} application.MultiFloorPathResult
// @Failure      400 {object} map[string]string
// @Router       /directions/indoor/multi-floor-path [post]
func (h *IndoorPathHandler) GetMultiFloorShortestPath(c *gin.Context) {
	var req application.MultiFloorPathRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid JSON body"})
		return
	}

	res, err := h.svc.MultiFloorShortestPath(req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, res)
}
