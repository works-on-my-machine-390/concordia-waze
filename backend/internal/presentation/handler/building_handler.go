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

// GetBuilding godoc
// @Summary     Get building by code
// @Description Get detailed information about a specific building by its code
// @Tags        buildings
// @Accept      json
// @Produce     json
// @Param       code path string true "Building code"
// @Success     200 {object} domain.Building
// @Failure     404 {object} map[string]string "building not found"
// @Failure     500 {object} map[string]string "internal server error"
// @Router      /buildings/{code} [get]
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
