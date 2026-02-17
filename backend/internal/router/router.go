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

const (
	userSearchHistoryPath = "/:userId/search-history"
)

func SetupRouter() *gin.Engine {
	router := gin.Default()

	userRepo := repository.NewInMemoryUserRepository()

	buildingDataRepo := repository.NewBuildingDataRepository(constants.BuildingDataFile)

	jwtManager := application.NewJWTManager(os.Getenv("JWT_SECRET"), constants.DefaultJWTDuration*time.Hour)
	userService := application.NewUserService(userRepo, jwtManager)

	placesClient := google.NewGooglePlacesClient(os.Getenv("GOOGLE_PLACES_API_KEY"))

	buildingService := application.NewBuildingService(buildingDataRepo, placesClient)
	campusService := application.NewCampusService(buildingDataRepo)
	imageService := application.NewImageService(buildingService, placesClient)
	firebaseService := application.NewFirebaseService()

	authHandler := handler.NewAuthHandler(userService, firebaseService)

	buildingHandler := handler.NewBuildingHandler(buildingService)
	campusHandler := handler.NewCampusHandler(campusService)
	imageHandler := handler.NewImageHandler(imageService)
	firebaseHandler := handler.NewFirebaseHandler(firebaseService)

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

	usersGroup := router.Group("/users")
	usersGroup.Use(middleware.RequireAuth(), middleware.ValidateUserOwnership())
	{
		usersGroup.POST("/:userId/profile", firebaseHandler.CreateUserProfile)
		usersGroup.GET("/:userId/profile", firebaseHandler.GetUserProfile)

		usersGroup.POST(userSearchHistoryPath, firebaseHandler.AddSearchHistory)
		usersGroup.GET(userSearchHistoryPath, firebaseHandler.GetSearchHistory)
		usersGroup.DELETE(userSearchHistoryPath, firebaseHandler.ClearSearchHistory)

		usersGroup.POST("/:userId/schedule", firebaseHandler.AddScheduleItem)
		usersGroup.GET("/:userId/schedule", firebaseHandler.GetUserSchedule)
		usersGroup.PUT("/:userId/schedule/:scheduleId", firebaseHandler.UpdateScheduleItem)
		usersGroup.DELETE("/:userId/schedule/:scheduleId", firebaseHandler.DeleteScheduleItem)

		usersGroup.POST("/:userId/savedAddresses", firebaseHandler.AddSavedAddress)
		usersGroup.GET("/:userId/savedAddresses", firebaseHandler.GetSavedAddresses)
		usersGroup.PUT("/:userId/savedAddresses/:addressId", firebaseHandler.UpdateSavedAddress)
		usersGroup.DELETE("/:userId/savedAddresses/:addressId", firebaseHandler.DeleteSavedAddress)
	}

	router.GET("/campuses/:campus/buildings", campusHandler.GetCampusBuildings)

	router.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerFiles.Handler))

	return router
}

func SetupTestRouter() *gin.Engine {
	gin.SetMode(gin.TestMode)
	return SetupRouter()
}
