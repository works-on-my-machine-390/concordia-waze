package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/works-on-my-machine-390/concordia-waze/internal/application"
)

type ImageHandler struct {
	service application.ImageServiceGetter
}

func NewImageHandler(service application.ImageServiceGetter) *ImageHandler {
	return &ImageHandler{service: service}
}

// @Summary     Get building images
// @Description Get images for a specific building by its code from Google Places API
// @Tags        buildings
// @Accept      json
// @Produce     json
// @Param       code path string true "Building code"
// @Success     200 {object} BuildingImagesResponse
// @Failure     404 {object} map[string]string "building not found or no images available"
// @Router      /buildings/{code}/images [get]
func (h *ImageHandler) GetBuildingImages(c *gin.Context) {
	code := c.Param("code")

	images, err := h.service.GetBuildingImages(code)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"building_code": code,
		"images":        images,
	})
}

type BuildingImagesResponse struct {
	BuildingCode string   `json:"building_code"`
	Images       []string `json:"images"`
}
