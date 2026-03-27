package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/works-on-my-machine-390/concordia-waze/internal/application"
)

type RoomSearchHandler struct {
	service application.RoomSearchGetter
}

func NewRoomSearchHandler(service application.RoomSearchGetter) *RoomSearchHandler {
	return &RoomSearchHandler{service: service}
}

type RoomSearchRequest struct {
	Building string `form:"building" binding:"required"`
	Room     string `form:"room" binding:"required"`
	Floor    *int   `form:"floor"` // optional; pointer so floor=0 works
}

type RoomSearchV2Request struct {
	Building string `form:"building" binding:"required"`
	Room     string `form:"room" binding:"required"`
}

// @Summary     Search a room by number
// @Description Returns room centroid coordinates by room number (EPSG:32198)
// @Tags        rooms
// @Produce     json
// @Param       building query string true "Building code (MB, LB, CC, VL)"
// @Param       room query string true "Room name/number (e.g., S2.285)"
// @Param       floor query int false "Floor (optional; if provided, only searches that floor)"
// @Success     200 {object} map[string]any
// @Failure     400 {object} map[string]string
// @Failure     404 {object} map[string]string
// @Failure     500 {object} map[string]string
// @Router      /rooms/search [get]
func (h *RoomSearchHandler) SearchRoom(c *gin.Context) {
	var req RoomSearchRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Missing or invalid parameters: " + err.Error()})
		return
	}

	room, err := h.service.FindRoom(req.Building, req.Room, req.Floor)
	if err != nil {
		// normalize not found
		if err.Error() == "room not found" {
			c.JSON(http.StatusNotFound, gin.H{"error": "room not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": room})
}

// @Summary     Search a room by number, with building fallback
// @Description Returns room information if found, using the building as fallback.
// @Tags        rooms
// @Produce     json
// @Param       building query string true "Building code (MB, LB, CC, VL)"
// @Param       room query string true "Room name/number (e.g., S2.285)"
// @Success     200 {object} map[string]any
// @Failure     400 {object} map[string]string
// @Failure     500 {object} map[string]string
// @Router      /rooms/safesearch [get]
func (h *RoomSearchHandler) FindRoomOrDefaultToBuilding(c *gin.Context) {
	var req RoomSearchV2Request
	if err := c.ShouldBindQuery(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Missing or invalid parameters: " + err.Error()})
		return
	}

	result, err := h.service.FindRoomOrDefaultToBuilding(req.Building, req.Room)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, result)
}
