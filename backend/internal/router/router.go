package router

import (
	swaggerFiles "github.com/swaggo/files"
	ginSwagger "github.com/swaggo/gin-swagger"

	_ "github.com/works-on-my-machine-390/concordia-waze/docs"

	"github.com/gin-gonic/gin"
	"github.com/works-on-my-machine-390/concordia-waze/internal/greeting"
)

func SetupRouter() *gin.Engine {
	router := gin.Default()
	router.GET("/index", greeting.GetGreetingString)
	router.GET("/index/obj", greeting.GetGreetingObject)

	router.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerFiles.Handler))
	return router
}

func SetupTestRouter() *gin.Engine {
	gin.SetMode(gin.TestMode)
	return SetupRouter()
}
