package handler

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/works-on-my-machine-390/concordia-waze/internal/application"
)

type ImageHandler struct {
	service application.ImageService
}

func NewImageHandler(service application.ImageService) *ImageHandler {
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

// @Summary     Get image from path
// @Description SWAGGER DOES NOT WORK SINCE THE PATH HAS '/' . Get images for a path from the backend resource directory
// @Tags        utilityd
// @Accept      json
// @Produce     image/png
// @Param       path  path      string  true  "Image path"
// @Success     404   {file}    binary  "Successfully returned binary data"
// @Failure     404   {object}  map[string]string "path not found"
// @Router      /images/{path} [get]
func (h *ImageHandler) GetStaticImage(c *gin.Context) {
	rel := c.Param("path")
	rel = strings.TrimPrefix(rel, "/")

	data, ct, err := h.service.LoadImage("./resource", rel)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}
	c.Data(http.StatusOK, ct, data)
}

type BuildingImagesResponse struct {
	BuildingCode string   `json:"building_code"`
	Images       []string `json:"images"`
}
