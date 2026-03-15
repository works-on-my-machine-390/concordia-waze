package main

import (
	"context"
	"log"
	"os"

	"github.com/joho/godotenv"
	docs "github.com/works-on-my-machine-390/concordia-waze/docs"
	"github.com/works-on-my-machine-390/concordia-waze/internal/application/firebase"
	"github.com/works-on-my-machine-390/concordia-waze/internal/router"
)

// @title           Concordia Waze API
// @version         1.0
// @description     This is the Concordia Waze API server.

// @securityDefinitions.apikey BearerAuth
// @in header
// @name Authorization
// @description Type "Bearer" followed by a space and JWT token.
func main() {
	_ = godotenv.Load()

	if os.Getenv("GO_ENV") == "production" {
		docs.SwaggerInfo.Host = os.Getenv("PRODUCTION_URL")
		docs.SwaggerInfo.Schemes = []string{"https"}
	} else if os.Getenv("GO_ENV") == "development" {
		docs.SwaggerInfo.Host = "localhost:8080"
		docs.SwaggerInfo.Schemes = []string{"http"}
	}

	// Local-only bypass
	if os.Getenv("SKIP_FIREBASE") != "true" {
		ctx := context.Background()
		if err := firebase.Initialize(ctx); err != nil {
			log.Fatalf("Failed to initialize Firebase: %v", err)
		}
		defer func() {
			if err := firebase.Close(ctx); err != nil {
				log.Printf("Failed to close Firebase: %v", err)
			}
		}()
	} else {
		log.Println("SKIP_FIREBASE=true -> Firebase initialization skipped")
	}

	r := router.SetupRouter()
	r.Run(":8080")
}
