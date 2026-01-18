package router

import (
	swaggerFiles "github.com/swaggo/files"
	ginSwagger "github.com/swaggo/gin-swagger"

	_ "github.com/works-on-my-machine-390/concordia-waze/docs"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/works-on-my-machine-390/concordia-waze/internal/greeting"
)

func SetupRouter() *gin.Engine {
	router := gin.Default()

	router.Use(cors.Default()) // All origins allowed by default

	router.GET("/greeting", greeting.GetGreetingString)
	router.GET("/greeting/obj", greeting.GetGreetingObject)

	router.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerFiles.Handler))
	return router
}

func SetupTestRouter() *gin.Engine {
	gin.SetMode(gin.TestMode)
	return SetupRouter()
}
