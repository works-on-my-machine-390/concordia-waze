package handler

import (
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"

	"github.com/works-on-my-machine-390/concordia-waze/internal/application"
	"github.com/works-on-my-machine-390/concordia-waze/internal/domain"
)

type DirectionsHandler struct {
	directions *application.DirectionsService
	buildings  *application.BuildingService
}

func NewDirectionsHandler(directions *application.DirectionsService, buildings *application.BuildingService) *DirectionsHandler {
	return &DirectionsHandler{
		directions: directions,
		buildings:  buildings,
	}
}

func parseFloatQuery(c *gin.Context, key string) (float64, bool) {
	raw := strings.TrimSpace(c.Query(key))
	if raw == "" {
		return 0, false
	}
	v, err := strconv.ParseFloat(raw, 64)
	if err != nil {
		return 0, false
	}
	return v, true
}

func normalizeMode(raw string) (string, bool) {
	m := strings.ToLower(strings.TrimSpace(raw))
	if m == "" {
		return "walking", true
	}

	switch m {
	case "walking", "driving", "transit", "shuttle":
		return m, true
	default:
		return "", false
	}
}

// GetDirections godoc
// @Summary      Get directions between coordinates
// @Description  Returns route polyline + step instructions (walking/driving/transit/shuttle)
// @Tags         directions
// @Produce      json
// @Param        start_lat query number true "Start latitude"
// @Param        start_lng query number true "Start longitude"
// @Param        end_lat   query number true "End latitude"
// @Param        end_lng   query number true "End longitude"
// @Param        mode      query string false "Mode (walking, driving, transit, shuttle)"
// @Param        day       query string false "Optional day for shuttle (monday..sunday)"
// @Param        time      query string false "Optional time for shuttle (HH:MM 24h)"
// @Success      200 {object} domain.DirectionsResponse
// @Failure      400 {object} map[string]string
// @Failure      500 {object} map[string]string
// @Router       /directions [get]
func (h *DirectionsHandler) GetDirections(c *gin.Context) {
	startLat, ok := parseFloatQuery(c, "start_lat")
	if !ok {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid start_lat"})
		return
	}
	startLng, ok := parseFloatQuery(c, "start_lng")
	if !ok {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid start_lng"})
		return
	}
	endLat, ok := parseFloatQuery(c, "end_lat")
	if !ok {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid end_lat"})
		return
	}
	endLng, ok := parseFloatQuery(c, "end_lng")
	if !ok {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid end_lng"})
		return
	}

	mode, valid := normalizeMode(c.Query("mode"))
	if !valid {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid mode"})
		return
	}

	day := c.Query("day") // optional
	at := c.Query("time") // optional

	start := domain.LatLng{Lat: startLat, Lng: startLng}
	end := domain.LatLng{Lat: endLat, Lng: endLng}

	resp, err := h.directions.GetDirectionsWithSchedule(start, end, mode, day, at)
	if err != nil {
		if err.Error() == "invalid mode" ||
			err.Error() == "invalid day" ||
			err.Error() == "invalid time" {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		if err.Error() == "no shuttle available" {
			c.JSON(http.StatusOK, gin.H{
				"message": "No shuttle available for the selected time and day",
			})
			return
		}

		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, resp)
}

// GetDirectionsByBuildings godoc
// @Summary      Get directions by building codes
// @Description  Uses building coordinates as origin/destination
// @Tags         directions
// @Produce      json
// @Param        start_code query string true "Start building code"
// @Param        end_code   query string true "End building code"
// @Param        mode       query string false "Mode (walking, driving, transit, shuttle)"
// @Param        day        query string false "Optional day for shuttle (monday..sunday)"
// @Param        time       query string false "Optional time for shuttle (HH:MM 24h)"
// @Success      200 {object} domain.DirectionsResponse
// @Failure      400 {object} map[string]string
// @Failure      500 {object} map[string]string
// @Router       /directions/buildings [get]
func (h *DirectionsHandler) GetDirectionsByBuildings(c *gin.Context) {
	startCode := strings.TrimSpace(c.Query("start_code"))
	endCode := strings.TrimSpace(c.Query("end_code"))
	if startCode == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid start_code"})
		return
	}
	if endCode == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid end_code"})
		return
	}

	mode, valid := normalizeMode(c.Query("mode"))
	if !valid {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid mode"})
		return
	}

	startB, err := h.buildings.GetBuilding(startCode)
	if err != nil || startB == nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid start_code"})
		return
	}
	endB, err := h.buildings.GetBuilding(endCode)
	if err != nil || endB == nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid end_code"})
		return
	}

	day := c.Query("day") // optional
	at := c.Query("time") // optional

	start := domain.LatLng{Lat: startB.Latitude, Lng: startB.Longitude}
	end := domain.LatLng{Lat: endB.Latitude, Lng: endB.Longitude}

	resp, err := h.directions.GetDirectionsWithSchedule(start, end, mode, day, at)
	if err != nil {
		if err.Error() == "invalid mode" ||
			err.Error() == "invalid day" ||
			err.Error() == "invalid time" {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		if err.Error() == "no shuttle available" {
			c.JSON(http.StatusOK, gin.H{
				"message": "No shuttle available for the selected time and day",
			})
			return
		}

		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, resp)
}
