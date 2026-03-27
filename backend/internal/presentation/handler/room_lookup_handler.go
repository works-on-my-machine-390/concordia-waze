package handler

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/works-on-my-machine-390/concordia-waze/internal/application"
	"github.com/works-on-my-machine-390/concordia-waze/internal/domain"
)

type RoomLookupHandler struct {
	service application.RoomLookupGetter
}

func NewRoomLookupHandler(service application.RoomLookupGetter) *RoomLookupHandler {
	return &RoomLookupHandler{service: service}
}

type RoomLookupRequest struct {
	Building string `form:"building" binding:"required"`
	Room     string `form:"room" binding:"required"`
}

// @Summary     Lookup room with building fallback
// @Description Returns room data when mapped and found; otherwise returns building latitude/longitude
// @Tags        rooms
// @Produce     json
// @Param       building query string true "Building code (MB, LB, CC, VL)"
// @Param       room query string true "Room name/number (e.g., S2.285)"
// @Success     200 {object} map[string]any
// @Failure     400 {object} map[string]string
// @Failure     404 {object} map[string]string
// @Failure     500 {object} map[string]string
// @Router      /rooms/lookup [get]
func (h *RoomLookupHandler) LookupRoom(c *gin.Context) {
	var req RoomLookupRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Missing or invalid parameters: " + err.Error()})
		return
	}

	lookup, err := h.service.LookupRoomOrBuilding(req.Building, req.Room)
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "building not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": lookup})
}
