package handler

import (
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/works-on-my-machine-390/concordia-waze/internal/domain"

	"github.com/works-on-my-machine-390/concordia-waze/internal/application"
	"github.com/works-on-my-machine-390/concordia-waze/internal/domain/request_format"
)

type DirectionsHandler struct {
	directionsRedirector application.DirectionsRedirecter
	directions           *application.DirectionsService
	buildings            *application.BuildingService
}

func NewDirectionsHandler(
	directionsRedirector application.DirectionsRedirecter,
	directionsService *application.DirectionsService,
	buildingsService *application.BuildingService,
) *DirectionsHandler {
	return &DirectionsHandler{
		directionsRedirector: directionsRedirector,
		directions:           directionsService,
		buildings:            buildingsService,
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
	case "walking", "driving", "transit", "shuttle", "bicycling":
		return m, true
	default:
		return "", false
	}
}

func hasAny(s ...string) bool {
	for _, v := range s {
		if strings.TrimSpace(v) != "" {
			return true
		}
	}
	return false
}

func (h *DirectionsHandler) writeDirectionsError(c *gin.Context, err error) {
	if err == nil {
		return
	}

	// bad request family
	if err.Error() == "invalid mode" ||
		err.Error() == "invalid day" ||
		err.Error() == "invalid time" ||
		err.Error() == "invalid shuttle_day" ||
		err.Error() == "invalid shuttle_time" ||
		err.Error() == "invalid shuttle departure" ||
		err.Error() == "cannot combine day/time with shuttle_day/shuttle_time" ||
		err.Error() == "shuttle_day and shuttle_time must both be provided" ||
		err.Error() == "shuttle_day/shuttle_time can only be used with mode=shuttle" {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err.Error() == "shuttle not applicable for same-campus trip" {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// special case: shuttle not available => only message
	if err.Error() == "No shuttle available at this time." {
		c.JSON(http.StatusOK, gin.H{
			"message": "No shuttle available at this time.",
		})
		return
	}

	// everything else
	c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
}

// GetDirections godoc
// @Summary      Get directions between coordinates
// @Description  Returns route polyline + step instructions (walking/driving/transit/shuttle/bicycling)
// @Tags         directions
// @Produce      json
// @Param        start_lat    query number true  "Start latitude"
// @Param        start_lng    query number true  "Start longitude"
// @Param        end_lat      query number true  "End latitude"
// @Param        end_lng      query number true  "End longitude"
// @Param        mode         query string false "Mode (walking, driving, transit, shuttle, bicycling)"
// @Param        day          query string false "Optional day for shuttle (monday..sunday) - automatic"
// @Param        time         query string false "Optional time for shuttle (HH:MM 24h) - automatic"
// @Param        shuttle_day  query string false "Manual shuttle day (monday..sunday) - manual departure selection"
// @Param        shuttle_time query string false "Manual shuttle time (HH:MM 24h) - must exist in schedule"
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

	// Automatic params
	day := c.Query("day")
	at := c.Query("time")

	// Manual shuttle params

	start := domain.LatLng{Lat: startLat, Lng: startLng}
	end := domain.LatLng{Lat: endLat, Lng: endLng}

	// ---- Automatic behavior ----
	resp, err := h.directions.GetDirectionsWithSchedule(start, end, []string{mode}, day, at)
	if err != nil {
		h.writeDirectionsError(c, err)
		return
	}

	c.JSON(http.StatusOK, resp)
}

// GetDirectionsByBuildings godoc
// @Summary      Get directions by building codes
// @Description  Uses building coordinates as origin/destination
// @Tags         directions
// @Produce      json
// @Param        start_code   query string true  "Start building code"
// @Param        end_code     query string true  "End building code"
// @Param        mode         query string false "Mode (walking, driving, transit, shuttle, bicycling)"
// @Param        day          query string false "Optional day for shuttle (monday..sunday) - automatic"
// @Param        time         query string false "Optional time for shuttle (HH:MM 24h) - automatic"
// @Param        shuttle_day  query string false "Manual shuttle day (monday..sunday) - manual departure selection"
// @Param        shuttle_time query string false "Manual shuttle time (HH:MM 24h) - must exist in schedule"
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

	start := domain.LatLng{Lat: startB.Latitude, Lng: startB.Longitude}
	end := domain.LatLng{Lat: endB.Latitude, Lng: endB.Longitude}

	// Automatic params
	day := c.Query("day")
	at := c.Query("time")

	// Manual shuttle params

	// ---- Automatic behavior ----
	resp, err := h.directions.GetDirectionsWithSchedule(start, end, []string{mode}, day, at)
	if err != nil {
		h.writeDirectionsError(c, err)
		return
	}

	c.JSON(http.StatusOK, resp)
}

// tiny local error type so we can create errors without importing "errors"
type errorString string

func (e errorString) Error() string { return string(e) }

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

	result, err := h.directionsRedirector.GetFullDirections(req)
	if err != nil {
		c.JSON(400, gin.H{"error": "Could not process request", "details": err.Error()})
		return
	}

	c.JSON(200, result)
}
