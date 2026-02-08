package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/works-on-my-machine-390/concordia-waze/internal/application"
)

type ImageHandler struct {
	service application.ImageService
}

func NewImageHandler(service application.ImageService) *ImageHandler {
	return &ImageHandler{service: service}
}

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
