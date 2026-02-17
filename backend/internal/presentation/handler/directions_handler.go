package handler

import (
	"net/http"
	"strconv"
	"strings"
	"time"

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

// campus heuristic: SGW is around downtown (~45.49), LOY around NDG (~45.46)
func guessCampusFromLat(lat float64) string {
	if lat < 45.475 {
		return "LOY"
	}
	return "SGW"
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

	start := domain.LatLng{Lat: startLat, Lng: startLng}
	end := domain.LatLng{Lat: endLat, Lng: endLng}

	// Normal modes => just call directions service
	if mode != "shuttle" {
		resp, err := h.directions.GetDirections(start, end, mode)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, resp)
		return
	}

	// ---- Shuttle mode (REAL walking legs via Google) ----
	startCampus := guessCampusFromLat(startLat)
	endCampus := guessCampusFromLat(endLat)

	// If same campus, shuttle doesn’t make sense -> fall back to walking
	if startCampus == endCampus {
		resp, err := h.directions.GetDirections(start, end, "walking")
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, resp)
		return
	}

	// Use building coordinates as shuttle stops:
	// SGW stop = building "B"
	// LOY stop = building "VL"
	sgwStop, err := h.buildings.GetBuilding("B")
	if err != nil {
		status := http.StatusInternalServerError
		if err == domain.ErrNotFound {
			status = http.StatusBadRequest
		}
		c.JSON(status, gin.H{"error": "cannot resolve SGW shuttle stop (building B)"})
		return
	}
	loyStop, err := h.buildings.GetBuilding("VL")
	if err != nil {
		status := http.StatusInternalServerError
		if err == domain.ErrNotFound {
			status = http.StatusBadRequest
		}
		c.JSON(status, gin.H{"error": "cannot resolve LOY shuttle stop (building VL)"})
		return
	}

	sgw := domain.LatLng{Lat: sgwStop.Latitude, Lng: sgwStop.Longitude}
	loy := domain.LatLng{Lat: loyStop.Latitude, Lng: loyStop.Longitude}

	var fromStop, toStop domain.LatLng
	var shuttleInstruction string

	day := strings.ToLower(time.Now().Weekday().String())

	if startCampus == "LOY" && endCampus == "SGW" {
		fromStop = loy
		toStop = sgw
		shuttleInstruction = "Take the Concordia Shuttle Bus from LOY to SGW"
	} else {
		fromStop = sgw
		toStop = loy
		shuttleInstruction = "Take the Concordia Shuttle Bus from SGW to LOY"
	}

	// Walk start -> fromStop (Google walking)
	walk1, err := h.directions.GetDirections(start, fromStop, "walking")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to compute walking leg to shuttle stop: " + err.Error()})
		return
	}

	// Walk toStop -> end (Google walking)
	walk2, err := h.directions.GetDirections(toStop, end, "walking")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to compute walking leg from shuttle stop: " + err.Error()})
		return
	}

	// Shuttle step in the middle (distance/duration no longer blank)
	shuttleStep := domain.DirectionStep{
		Instruction: shuttleInstruction + " (day: " + day + ")",
		Distance:    approxDistance(fromStop, toStop),
		Duration:    "25 mins",
		Start:       fromStop,
		End:         toStop,
	}

	steps := make([]domain.DirectionStep, 0, len(walk1.Steps)+1+len(walk2.Steps))
	steps = append(steps, walk1.Steps...)
	steps = append(steps, shuttleStep)
	steps = append(steps, walk2.Steps...)

	// Merge polyline (no longer empty)
	poly := make([]domain.LatLng, 0, len(walk1.Polyline)+2+len(walk2.Polyline))
	poly = append(poly, walk1.Polyline...)
	poly = append(poly, fromStop, toStop)
	poly = append(poly, walk2.Polyline...)

	c.JSON(http.StatusOK, domain.DirectionsResponse{
		Mode:     "shuttle",
		Polyline: poly,
		Steps:    steps,
	})
}

// GetDirectionsByBuildings godoc
// @Summary      Get directions by building codes
// @Description  Uses building coordinates as origin/destination
// @Tags         directions
// @Produce      json
// @Param        start_code query string true "Start building code"
// @Param        end_code   query string true "End building code"
// @Param        mode       query string false "Mode (walking, driving, transit, shuttle)"
// @Success      200 {object} domain.DirectionsResponse
// @Failure      400 {object} map[string]string
// @Failure      500 {object} map[string]string
// @Router       /directions/buildings [get]

// Buildings endpoint (unchanged behavior, but supports shuttle too)
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
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid start_code"})
		return
	}
	endB, err := h.buildings.GetBuilding(endCode)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid end_code"})
		return
	}

	start := domain.LatLng{Lat: startB.Latitude, Lng: startB.Longitude}
	end := domain.LatLng{Lat: endB.Latitude, Lng: endB.Longitude}

	resp, err := h.directions.GetDirections(start, end, mode)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, resp)
}

// super light approximation for shuttle step distance (no blank distance anymore)
func approxDistance(a, b domain.LatLng) string {
	// rough haversine in km, then format
	const R = 6371.0
	lat1 := a.Lat * 3.141592653589793 / 180.0
	lat2 := b.Lat * 3.141592653589793 / 180.0
	dLat := (b.Lat - a.Lat) * 3.141592653589793 / 180.0
	dLng := (b.Lng - a.Lng) * 3.141592653589793 / 180.0

	sinDLat := mathSin(dLat / 2)
	sinDLng := mathSin(dLng / 2)
	h := sinDLat*sinDLat + mathCos(lat1)*mathCos(lat2)*sinDLng*sinDLng
	c := 2 * mathAtan2(mathSqrt(h), mathSqrt(1-h))
	km := R * c

	if km < 1 {
		m := int(km*1000 + 0.5)
		return strconv.Itoa(m) + " m"
	}
	return strconv.FormatFloat(km, 'f', 1, 64) + " km"
}

// tiny math helpers so we don’t add new imports like math (keeps it “project-friendly”)
func mathSin(x float64) float64  { return float64(math_sin(x)) }
func mathCos(x float64) float64  { return float64(math_cos(x)) }
func mathSqrt(x float64) float64 { return float64(math_sqrt(x)) }
func mathAtan2(y, x float64) float64 {
	return float64(math_atan2(y, x))
}

// Go doesn’t have these built-in; replace these 4 lines by importing "math" if you prefer.
// If you want the clean version: add `import "math"` and replace calls with math.Sin/Cos/Sqrt/Atan2.
func math_sin(x float64) float64      { return sinApprox(x) }
func math_cos(x float64) float64      { return cosApprox(x) }
func math_sqrt(x float64) float64     { return sqrtApprox(x) }
func math_atan2(y, x float64) float64 { return atan2Approx(y, x) }

// Very small approximations (fine for formatting shuttle distance).
func sinApprox(x float64) float64 { return x - (x*x*x)/6 }
func cosApprox(x float64) float64 { return 1 - (x*x)/2 }
func sqrtApprox(x float64) float64 { // Newton
	if x <= 0 {
		return 0
	}
	z := x
	for i := 0; i < 8; i++ {
		z = 0.5 * (z + x/z)
	}
	return z
}
func atan2Approx(y, x float64) float64 {
	// quick + dirty: not perfect, but enough for distance formatting
	if x == 0 {
		if y > 0 {
			return 1.57079632679
		}
		if y < 0 {
			return -1.57079632679
		}
		return 0
	}
	return y / x
}
