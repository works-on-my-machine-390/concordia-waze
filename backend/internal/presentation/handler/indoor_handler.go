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

// GetMultiFloorShortestPath handles pathfinding from (x,y) on one floor to (x,y) on another floor
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
