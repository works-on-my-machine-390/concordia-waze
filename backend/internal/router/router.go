package router

import (
	"os"
	"time"

	"github.com/gin-gonic/gin"
	swaggerFiles "github.com/swaggo/files"
	ginSwagger "github.com/swaggo/gin-swagger"

	// This blank import is necessary for Swagger documentation generation
	_ "github.com/works-on-my-machine-390/concordia-waze/docs"

	"github.com/works-on-my-machine-390/concordia-waze/internal/application"
	"github.com/works-on-my-machine-390/concordia-waze/internal/application/google"
	"github.com/works-on-my-machine-390/concordia-waze/internal/constants"
	"github.com/works-on-my-machine-390/concordia-waze/internal/persistence/repository"
	"github.com/works-on-my-machine-390/concordia-waze/internal/presentation/handler"
	"github.com/works-on-my-machine-390/concordia-waze/internal/presentation/middleware"
)

func SetupRouter() *gin.Engine {
	router := gin.Default()

	userRepo := repository.NewInMemoryUserRepository()

	buildingDataRepo := repository.NewBuildingDataRepository(constants.BuildingDataFile)

	jwtManager := application.NewJWTManager(os.Getenv("JWT_SECRET"), constants.DefaultJWTDuration*time.Hour)
	userService := application.NewUserService(userRepo, jwtManager)

	placesClient := google.NewGooglePlacesClient(os.Getenv("GOOGLE_PLACES_API_KEY"))

	buildingService := application.NewBuildingService(buildingDataRepo)
	campusService := application.NewCampusService(buildingDataRepo)
	imageService := application.NewImageService(buildingService, placesClient)

	authHandler := handler.NewAuthHandler(userService)

	buildingHandler := handler.NewBuildingHandler(buildingService)
	campusHandler := handler.NewCampusHandler(campusService)
	imageHandler := handler.NewImageHandler(imageService)

	router.Use(middleware.AuthMiddleware(jwtManager))

	authGroup := router.Group("/auth")
	{
		authGroup.POST("/signup", authHandler.SignUp)
		authGroup.POST("/login", authHandler.Login)
		authGroup.GET("/profile", middleware.RequireAuth(), authHandler.GetProfile)
		authGroup.POST("/logout", middleware.RequireAuth(), authHandler.Logout)
	}

	buildingsGroup := router.Group("/buildings")
	{
		buildingsGroup.GET("/:code", buildingHandler.GetBuilding)
		buildingsGroup.GET("/:code/images", imageHandler.GetBuildingImages)
	}

	router.GET("/campuses/:campus/buildings", campusHandler.GetCampusBuildings)

	router.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerFiles.Handler))

	return router
}

func SetupTestRouter() *gin.Engine {
	gin.SetMode(gin.TestMode)
	return SetupRouter()
}
