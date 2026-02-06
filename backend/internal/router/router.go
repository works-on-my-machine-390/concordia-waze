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
	"github.com/works-on-my-machine-390/concordia-waze/internal/persistence/repository"
	"github.com/works-on-my-machine-390/concordia-waze/internal/presentation/handler"
	"github.com/works-on-my-machine-390/concordia-waze/internal/presentation/middleware"
)

// SetupRouter configures all routes and middleware
func SetupRouter() *gin.Engine {
	router := gin.Default()

	// Initialize repositories (persistance layer)
	userRepo := repository.NewInMemoryUserRepository()

	// Initialize services (application layer)
	jwtManager := application.NewJWTManager(os.Getenv("JWT_SECRET"), 24*time.Hour)
	userService := application.NewUserService(userRepo, jwtManager)

	// Initialize handlers (presentation layer)
	authHandler := handler.NewAuthHandler(userService)

	// Apply auth middleware globally
	router.Use(middleware.AuthMiddleware(jwtManager))

	// Auth routes (public)
	authGroup := router.Group("/auth")
	{
		authGroup.POST("/signup", authHandler.SignUp)
		authGroup.POST("/login", authHandler.Login)
		authGroup.GET("/profile", middleware.RequireAuth(), authHandler.GetProfile)
		authGroup.POST("/logout", middleware.RequireAuth(), authHandler.Logout)
	}

	// Swagger documentation
	router.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerFiles.Handler))

	return router
}

// SetupTestRouter creates a router for testing
func SetupTestRouter() *gin.Engine {
	gin.SetMode(gin.TestMode)
	return SetupRouter()
}
