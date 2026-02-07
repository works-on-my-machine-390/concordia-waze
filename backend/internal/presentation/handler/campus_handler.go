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
