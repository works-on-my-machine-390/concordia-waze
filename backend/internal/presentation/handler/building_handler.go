package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/works-on-my-machine-390/concordia-waze/internal/application"
	"github.com/works-on-my-machine-390/concordia-waze/internal/domain"
)

type BuildingHandler struct {
	service *application.BuildingService
}

func NewBuildingHandler(service *application.BuildingService) *BuildingHandler {
	return &BuildingHandler{service: service}
}

func (h *BuildingHandler) GetBuilding(c *gin.Context) {
	code := c.Param("code")

	building, err := h.service.GetBuilding(code)
	if err != nil {
		if err == domain.ErrNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "building not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, building)
}
