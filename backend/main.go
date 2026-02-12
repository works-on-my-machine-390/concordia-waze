package main

import (
	"context"
	"log"

	"github.com/joho/godotenv"
	_ "github.com/works-on-my-machine-390/concordia-waze/docs"
	"github.com/works-on-my-machine-390/concordia-waze/internal/application/firebase"
	"github.com/works-on-my-machine-390/concordia-waze/internal/router"
)

// @title Concordia Waze API
// @version 1.0
// @description This is the Concordia Waze API server.
// @host localhost:8080
// @BasePath
// @securityDefinitions.apikey BearerAuth
// @in header
// @name Authorization
// @description Type "Bearer" followed by a space and JWT token.

func main() {
	err := godotenv.Load()
	if err != nil {
		log.Println("No .env file found")
	}

	ctx := context.Background()
	if err := firebase.Initialize(ctx); err != nil {
		log.Fatalf("Failed to initialize Firebase: %v", err)
	}
	defer func() {
		if err := firebase.Close(ctx); err != nil {
			log.Printf("Failed to close Firebase: %v", err)
		}
	}()

	r := router.SetupRouter()
	r.Run(":8080")

}
