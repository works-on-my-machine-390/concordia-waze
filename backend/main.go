package main

import (
	"net/http"

	"github.com/gin-gonic/gin"
	swaggerFiles "github.com/swaggo/files"
	ginSwagger "github.com/swaggo/gin-swagger"

	_ "github.com/works-on-my-machine-390/concordia-waze/docs"
)

// @title Concordia Waze API
// @version 1.0
// @description This is the Concordia Waze API server.
// @host localhost:8080
// @BasePath /

func main() {

	router := gin.Default()
	router.GET("/index", getGreetingString)
	router.GET("/index/obj", getGreetingObject)

	// Swagger route
	router.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerFiles.Handler))

	router.Run("localhost:8080")

}

// @Summary Get greeting string
// @Description Returns a simple greeting string
// @Tags greeting
// @Produce plain
// @Success 200 {string} string "hello world"
// @Router /index [get]
func getGreetingString(c *gin.Context) {
	c.String(http.StatusOK, "hello world")
}

// @Summary Get greeting object
// @Description Returns a greeting message as JSON object
// @Tags greeting
// @Produce json
// @Success 200 {object} map[string]string
// @Router /index/obj [get]
func getGreetingObject(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"message": "hello world"})
}
