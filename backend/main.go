package main

import (
	"github.com/gin-gonic/gin"
	swaggerFiles "github.com/swaggo/files"
	ginSwagger "github.com/swaggo/gin-swagger"

	_ "works-on-my-machine/concordia-waze/docs"
	"works-on-my-machine/concordia-waze/internal/service"
)

// @title Concordia Waze API
// @version 1.0
// @description This is the Concordia Waze API server.
// @host localhost:8080
// @BasePath /

func main() {

	router := setupRouter()
	router.Run("localhost:8080")

}

func setupRouter() *gin.Engine {
	router := gin.Default()

	router.GET("/index", service.GetGreetingString)
	router.GET("/index/obj", service.GetGreetingObject)

	// Swagger route
	router.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerFiles.Handler))

	return router
}
