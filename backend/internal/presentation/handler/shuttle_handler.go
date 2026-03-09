package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/works-on-my-machine-390/concordia-waze/internal/application"
)

type ShuttleHandler struct {
	service *application.ShuttleService
}

func NewShuttleHandler(service *application.ShuttleService) *ShuttleHandler {
	return &ShuttleHandler{service: service}
}

// GetCampusDaySchedule godoc
// @Summary     Get shuttle departures for a campus on a given day
// @Description Returns a list of departure times (HH:MM strings) for the specified campus and day.
// @Tags        shuttle
// @Accept      json
// @Produce     json
// @Param       day path string true "Day of week (e.g., monday)"
// @Param       campus_code path string true "Campus code (LOY or SGW)"
// @Success     200 {array} string
// @Failure     404 {object} map[string]string "not found"
// @Failure     500 {object} map[string]string "internal server error"
// @Router      /shuttle/{day}/{campus_code} [get]
func (h *ShuttleHandler) GetCampusDaySchedule(c *gin.Context) {
	day := c.Param("day")
	campus := c.Param("campus_code")

	schedule, err := h.service.GetDepartures(day, campus)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, schedule)
}

// GetDepartureData godoc
// @Summary     Get full shuttle schedule
// @Description Returns the entire shuttle schedule as a mapping: day -> campus -> list of times.
// @Tags        shuttle
// @Accept      json
// @Produce     json
// @Success     200 {object} map[string]map[string][]string
// @Failure     500 {object} map[string]string "internal server error"
// @Router      /shuttle [get]
func (h *ShuttleHandler) GetDepartureData(c *gin.Context) {
	data, err := h.service.GetDepartureData()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, data)
}

// GetShuttleMarkerPositions godoc
// @Summary     Get shuttle marker positions
// @Description Returns the latitude and longitude for shuttle stop markers at both campuses.
// @Tags        shuttle
// @Accept      json
// @Produce     json
// @Success     200 {object} map[string]map[string]float64
// @Failure     500 {object} map[string]string "internal server error"
// @Router      /shuttle/markers [get]
func (h *ShuttleHandler) GetShuttleMarkerPositions(c *gin.Context) {
	positions := h.service.GetShuttleMarkerPositions()
	c.JSON(http.StatusOK, positions)
}
