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
	shuttleDataRepo := repository.NewShuttleDataRepository(constants.ShuttleDataFile)

	jwtManager := application.NewJWTManager(os.Getenv("JWT_SECRET"), constants.DefaultJWTDuration*time.Hour)
	userService := application.NewUserService(userRepo, jwtManager)

	placesClient := google.NewGooglePlacesClient(os.Getenv("GOOGLE_PLACES_API_KEY"))

	buildingService := application.NewBuildingService(buildingDataRepo, placesClient)
	campusService := application.NewCampusService(buildingDataRepo)
	imageService := application.NewImageService(buildingService, placesClient)
	firebaseService := application.NewFirebaseService()
	shuttleService := application.NewShuttleService(shuttleDataRepo)
	pointOfInterestService := application.NewPointOfInterestService(placesClient)

	// ---- Directions wiring (FIXED: inject shuttle schedule repo) ----
	directionsClient := google.NewGoogleDirectionsClient(os.Getenv("GOOGLE_DIRECTIONS_API_KEY"))
	directionsService := application.NewDirectionsService(directionsClient).WithShuttleRepo(shuttleService)
	directionsHandler := handler.NewDirectionsHandler(directionsService, buildingService)
	// ---------------------------------------------------------------

	authHandler := handler.NewAuthHandler(userService, firebaseService)

	buildingHandler := handler.NewBuildingHandler(buildingService)
	campusHandler := handler.NewCampusHandler(campusService)
	imageHandler := handler.NewImageHandler(imageService)
	firebaseHandler := handler.NewFirebaseHandler(firebaseService)
	shuttleHandler := handler.NewShuttleHandler(shuttleService)
	pointOfInterestHandler := handler.NewPointOfInterestHandler(pointOfInterestService)

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
		buildingsGroup.GET("/list", buildingHandler.GetAllBuildingsByCampus)
		buildingsGroup.GET("/:code", buildingHandler.GetBuilding)
		buildingsGroup.GET("/:code/images", imageHandler.GetBuildingImages)
	}

	// Directions endpoints (PUBLIC)
	// 1) Lat/Lng version:
	// GET /directions?start_lat=...&start_lng=...&end_lat=...&end_lng=...&mode=walking|transit|driving|shuttle
	// Optional for shuttle: &day=monday..sunday &time=HH:MM
	router.GET("/directions", directionsHandler.GetDirections)

	// 2) Building codes version:
	// GET /directions/buildings?start_code=EV&end_code=H&mode=walking|transit|driving|shuttle
	// Optional for shuttle: &day=monday..sunday &time=HH:MM
	router.GET("/directions/buildings", directionsHandler.GetDirectionsByBuildings)

	shuttleGroup := router.Group("/shuttle")
	{
		shuttleGroup.GET("", shuttleHandler.GetDepartureData)
		shuttleGroup.GET("/:day/:campus_code", shuttleHandler.GetCampusDaySchedule)
		shuttleGroup.GET("/markers", shuttleHandler.GetShuttleMarkerPositions)
	}

	router.GET("/campuses/:campus/buildings", campusHandler.GetCampusBuildings)

	router.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerFiles.Handler))

	router.GET("/pointofinterest", pointOfInterestHandler.GetNearbyPointsOfInterest)

	// =========================
	// PROTECTED ROUTES (auth)
	// =========================

	usersGroup := router.Group("/users")
	usersGroup.Use(middleware.RequireAuth(), middleware.ValidateUserOwnership())
	{
		usersGroup.POST("/:userId/profile", firebaseHandler.CreateUserProfile)
		usersGroup.GET("/:userId/profile", firebaseHandler.GetUserProfile)

		usersGroup.POST("/:userId/schedule", firebaseHandler.AddScheduleItem)
		usersGroup.GET("/:userId/schedule", firebaseHandler.GetUserSchedule)
		usersGroup.PUT("/:userId/schedule/:scheduleId", firebaseHandler.UpdateScheduleItem)
		usersGroup.DELETE("/:userId/schedule/:scheduleId", firebaseHandler.DeleteScheduleItem)

		usersGroup.POST("/:userId/savedAddresses", firebaseHandler.AddSavedAddress)
		usersGroup.GET("/:userId/savedAddresses", firebaseHandler.GetSavedAddresses)
		usersGroup.PUT("/:userId/savedAddresses/:addressId", firebaseHandler.UpdateSavedAddress)
		usersGroup.DELETE("/:userId/savedAddresses/:addressId", firebaseHandler.DeleteSavedAddress)

		usersGroup.POST("/:userId/history", firebaseHandler.AddDestinationHistory)
		usersGroup.GET("/:userId/history", firebaseHandler.GetDestinationHistory)
		usersGroup.DELETE("/:userId/history", firebaseHandler.ClearDestinationHistory)
	}

	return router
}

func SetupTestRouter() *gin.Engine {
	gin.SetMode(gin.TestMode)
	return SetupRouter()
}
