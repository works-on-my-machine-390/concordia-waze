package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/works-on-my-machine-390/concordia-waze/internal/application"
	"github.com/works-on-my-machine-390/concordia-waze/internal/domain"
)

type CampusHandler struct {
	service *application.CampusService
}

func NewCampusHandler(service *application.CampusService) *CampusHandler {
	return &CampusHandler{service: service}
}

// GetCampusBuildings godoc
// @Summary     List buildings for a campus
// @Description Return all building codes and names for a given campus (e.g. "SGW" or "LOY").
// @Tags        buildings
// @Accept      json
// @Produce     json
// @Param       campus path string true "Campus code (SGW or LOY)"
// @Success     200 {object} domain.CampusBuildingsResponse
// @Failure     404 {object} map[string]string "campus not found"
// @Failure     500 {object} map[string]string "internal server error"
// @Router      /campuses/{campus}/buildings [get]
func (h *CampusHandler) GetCampusBuildings(c *gin.Context) {
	campus := c.Param("campus")

	buildings, err := h.service.GetCampusBuildings(campus)
	if err != nil {
		if err == domain.ErrNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "campus not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, domain.CampusBuildingsResponse{
		Campus:    campus,
		Buildings: buildings,
	})
}
