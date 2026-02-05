package router

import (
	"os"
	"time"

	"github.com/gin-gonic/gin"
	swaggerFiles "github.com/swaggo/files"
	ginSwagger "github.com/swaggo/gin-swagger"
	_ "github.com/works-on-my-machine-390/concordia-waze/docs"
	"github.com/works-on-my-machine-390/concordia-waze/internal/application"
	"github.com/works-on-my-machine-390/concordia-waze/internal/persistence/repository"
	"github.com/works-on-my-machine-390/concordia-waze/internal/presentation/handler"
	"github.com/works-on-my-machine-390/concordia-waze/internal/presentation/middleware"
)

func SetupRouter() *gin.Engine {
	router := gin.Default()

	userRepo := repository.NewInMemoryUserRepository()

	buildingDataRepo := repository.NewBuildingDataRepository("building_information.json")

	jwtManager := application.NewJWTManager(os.Getenv("JWT_SECRET"), 24*time.Hour)
	userService := application.NewUserService(userRepo, jwtManager)

	buildingService := application.NewBuildingService(buildingDataRepo)
	campusService := application.NewCampusService(buildingDataRepo)

	authHandler := handler.NewAuthHandler(userService)

	buildingHandler := handler.NewBuildingHandler(buildingService)
	campusHandler := handler.NewCampusHandler(campusService)

	router.Use(middleware.AuthMiddleware(jwtManager))

	authGroup := router.Group("/auth")
	{
		authGroup.POST("/signup", authHandler.SignUp)
		authGroup.POST("/login", authHandler.Login)
		authGroup.GET("/profile", middleware.RequireAuth(), authHandler.GetProfile)
		authGroup.POST("/logout", middleware.RequireAuth(), authHandler.Logout)
	}

	router.GET("/buildings/:code", middleware.RequireAuth(), buildingHandler.GetBuilding)

	router.GET("/campuses/:campus/buildings", middleware.RequireAuth(), campusHandler.GetCampusBuildings)

	router.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerFiles.Handler))

	return router
}

func SetupTestRouter() *gin.Engine {
	gin.SetMode(gin.TestMode)
	return SetupRouter()
}
