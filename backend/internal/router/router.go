package router

import (
	"os"
	"path/filepath"
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
	floorDataRepo := repository.NewFloorRepository(constants.FloorDataFile)

	jwtManager := application.NewJWTManager(os.Getenv("JWT_SECRET"), constants.DefaultJWTDuration*time.Hour)
	userService := application.NewUserService(userRepo, jwtManager)

	calendarClient := google.NewCalendarClient()
	calendarService := application.NewCalendarService(calendarClient)

	placesClient := google.NewGooglePlacesClient(os.Getenv("GOOGLE_PLACES_API_KEY"))

	buildingService := application.NewBuildingService(buildingDataRepo, floorDataRepo, placesClient, "./")
	campusService := application.NewCampusService(buildingDataRepo)
	imageService := application.NewImageService(buildingService, placesClient)
	var authFirebaseService handler.FirebaseProfileService
	var firebaseHandlerService handler.FirebaseService
	var firebaseSvc *application.FirebaseService
	if os.Getenv("SKIP_FIREBASE") != "true" {
		firebaseSvc = application.NewFirebaseService()
		authFirebaseService = firebaseSvc
		firebaseHandlerService = firebaseSvc
	}
	shuttleService := application.NewShuttleService(shuttleDataRepo)
	pointOfInterestService := application.NewPointOfInterestService(placesClient)

	var favoriteRepo repository.FavoriteRepository
	if firebaseSvc != nil {
		favoriteRepo = application.NewHybridFavoriteRepository(firebaseSvc)
	} else {
		favoriteRepo = repository.NewInMemoryFavoriteRepository()
	}
	favoritesService := application.NewFavoritesService(favoriteRepo)

	dataDir, err := findIndoorDataDir()
	if err != nil {
		// fail fast with a clear message
		panic("could not find campusData/GeoJsonDataParser/Data from working dir: " + err.Error())
	}
	indoorPOIRepo := repository.NewIndoorPOIRepository(dataDir)
	indoorPOIService := application.NewIndoorPointOfInterestService(indoorPOIRepo)
	indoorRoomRepo := repository.NewIndoorRoomRepository(dataDir) // reuse same base dir you used for POIs
	roomSearchService := application.NewRoomSearchService(indoorRoomRepo)
	roomSearchHandler := handler.NewRoomSearchHandler(roomSearchService)

	indoorPathService := application.NewIndoorPathService(floorDataRepo, indoorRoomRepo)
	indoorPathHandler := handler.NewIndoorPathHandler(indoorPathService)

	// ---- Directions wiring (FIXED: inject shuttle schedule repo) ----
	directionsClient := google.NewGoogleDirectionsClient(os.Getenv("GOOGLE_DIRECTIONS_API_KEY"))
	directionsService := application.NewDirectionsService(directionsClient).WithShuttleRepo(shuttleService)
	directionsRedirector := application.NewDirectionsRedirectorService(directionsService, indoorPathService, indoorPOIRepo, buildingService)
	directionsHandler := handler.NewDirectionsHandler(directionsRedirector, directionsService, buildingService)
	// ---------------------------------------------------------------

	authHandler := handler.NewAuthHandler(userService, authFirebaseService)

	buildingHandler := handler.NewBuildingHandler(buildingService)
	campusHandler := handler.NewCampusHandler(campusService)
	imageHandler := handler.NewImageHandler(imageService)
	firebaseHandler := handler.NewFirebaseHandler(firebaseHandlerService)
	shuttleHandler := handler.NewShuttleHandler(shuttleService)
	pointOfInterestHandler := handler.NewPointOfInterestHandler(pointOfInterestService, indoorPOIService)
	favoritesHandler := handler.NewFavoritesHandler(favoritesService)

	googleRateLimiter := middleware.NewIPRateLimiterFromEnv(
		"GOOGLE",
		constants.DefaultGoogleRateLimitRPS,
		constants.DefaultGoogleRateLimitBurst,
	)
	googleLimited := googleRateLimiter.Middleware()

	router.Use(middleware.AuthMiddleware(jwtManager))

	tokenStorePath := os.Getenv("GOOGLE_TOKEN_STORE_FILE")
	if tokenStorePath == "" {
		tokenStorePath = "data/google-token-store.json"
	}
	googleOAuthHandler := handler.NewGoogleOAuthHandler(firebaseSvc)

	calendarHandler := handler.NewCalendarHandler(firebaseSvc, calendarService)

	authGroup := router.Group("/auth")
	{
		authGroup.POST("/signup", authHandler.SignUp)
		authGroup.POST("/login", authHandler.Login)
		authGroup.GET("/profile", middleware.RequireAuth(), authHandler.GetProfile)
		authGroup.POST("/logout", middleware.RequireAuth(), authHandler.Logout)

		authGroup.GET("/google", middleware.RequireAuth(), googleOAuthHandler.GetAuthStatus)
		authGroup.GET("/google/callback", googleOAuthHandler.Callback)
	}

	buildingsGroup := router.Group("/buildings")
	{
		buildingsGroup.GET("/list", buildingHandler.GetAllBuildingsByCampus)

		// Calls Google Places (opening hours lookup) -> rate limit
		buildingsGroup.GET("/:code", googleLimited, buildingHandler.GetBuilding)

		// Calls Google Places Photos via placesClient -> rate limit
		buildingsGroup.GET("/:code/images", googleLimited, imageHandler.GetBuildingImages)

		// Local repo only -> no rate limit
		buildingsGroup.GET("/floor/:code", buildingHandler.GetFloorsByBuilding)
	}

	// image utility endpoint (PUBLIC) - local/static, no rate limit needed
	router.GET("/images/*path", imageHandler.GetStaticImage)

	// Directions endpoints (PUBLIC) - calls Google Directions API -> rate limit
	router.POST("/directions", googleLimited, directionsHandler.GetFullDirections)
	router.POST("/directions/indoor/multi-floor-path", indoorPathHandler.GetMultiFloorShortestPath)

	shuttleGroup := router.Group("/shuttle")
	{
		shuttleGroup.GET("", shuttleHandler.GetDepartureData)
		shuttleGroup.GET("/:day/:campus_code", shuttleHandler.GetCampusDaySchedule)
		shuttleGroup.GET("/markers", shuttleHandler.GetShuttleMarkerPositions)
	}

	router.GET("/campuses/:campus/buildings", campusHandler.GetCampusBuildings)

	router.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerFiles.Handler))

	// Nearby POI uses Google Places API -> rate limit
	router.GET("/pointofinterest", googleLimited, pointOfInterestHandler.GetNearbyPointsOfInterest)

	// Indoor POIs + room search are local repo-based -> no external API calls (leave unlimited)
	router.GET("/pointofinterest/indoor", pointOfInterestHandler.GetNearbyIndoorPOIs)
	router.GET("/rooms/search", roomSearchHandler.SearchRoom)

	// Favorites (optional auth — ownership enforced in handler)
	userFavGroup := router.Group("/users/:userId/favorites")
	{
		userFavGroup.POST("", favoritesHandler.CreateFavorite)
		userFavGroup.GET("", favoritesHandler.GetFavorites)
		userFavGroup.DELETE("/:id", favoritesHandler.DeleteFavorite)
	}

	// Calendar
	calendarGroup := router.Group("/calendar")
	calendarGroup.Use(middleware.RequireAuth())
	{
		calendarGroup.GET("/sync", calendarHandler.SyncCalendarEvents)
		calendarGroup.GET("", calendarHandler.GetCalendarEvents)
		calendarGroup.DELETE("", calendarHandler.DeleteCalendarEvents)
		calendarGroup.POST("", calendarHandler.AddCalendarEvents)
	}

	// =========================
	// PROTECTED ROUTES (auth)
	// =========================

	usersGroup := router.Group("/users")
	usersGroup.Use(middleware.RequireAuth(), middleware.ValidateUserOwnership())
	{
		usersGroup.POST("/:userId/profile", firebaseHandler.CreateUserProfile)
		usersGroup.GET("/:userId/profile", firebaseHandler.GetUserProfile)

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

func findIndoorDataDir() (string, error) {
	wd, err := os.Getwd()
	if err != nil {
		return "", err
	}

	cur := wd
	for {
		candidate := filepath.Join(cur, "campusFloormaps", "Data")
		if stat, err := os.Stat(candidate); err == nil && stat.IsDir() {
			return candidate, nil
		}
		parent := filepath.Dir(cur)
		if parent == cur {
			break // reached filesystem root
		}
		cur = parent
	}

	return "", os.ErrNotExist
}
