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

// GetAllBuildingsByCampus godoc
// @Summary     List all buildings grouped by campus
// @Description Return all building codes, names and long names grouped by campus. Response shape:
// @Description {
// @Description   "buildings": {
// @Description     "SGW": [ { "code": "...", "name": "...", "long_name": "...", "campus": "SGW" }, ... ],
// @Description     "LOY": [ ... ]
// @Description   }
// @Description }
// @Tags        buildings
// @Accept      json
// @Produce     json
// @Param       appendFloors query bool false "Whether to append floor information"
// @Success     200 {object} map[string]map[string][]domain.BuildingSummary
// @Failure     500 {object} map[string]string "internal server error"
// @Router      /buildings/list [get]
func (h *BuildingHandler) GetAllBuildingsByCampus(c *gin.Context) {
	appendFloors := c.Query("appendFloors") == "true"
	result, err := h.service.GetAllBuildingsByCampus(appendFloors)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Ensure keys are exactly "SGW" and "LOY" if present in result; handler just returns what service gives.
	c.JSON(http.StatusOK, gin.H{"buildings": result})
}

// GetFloors godoc
// @Summary     return all building floors for a specific building code
// @Description
// @Description {
// @Description   "floors": {
// @Description      { "name": "...", "imgPath": "...", "vertices": [...], "edge": [...], "poi": [...] },
// @Description    { ... }
// @Description   }
// @Description }
// @Tags        buildings
// @Accept      json
// @Produce     json
// @Param       code path string true "Building code"
// @Success     200 {object} map[string][]domain.Floor
// @Failure     500 {object} map[string]string "internal server error"
// @Router      /buildings/floor/{code} [get]
func (h *BuildingHandler) GetFloorsByBuilding(c *gin.Context) {
	code := c.Param("code")

	result, err := h.service.GetBuildingFloors(code)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"floors": result})
}
