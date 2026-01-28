package main

import (
	"log"

	"github.com/joho/godotenv"
	_ "github.com/works-on-my-machine-390/concordia-waze/docs"
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
	router := router.SetupRouter()
	router.Run("localhost:8080")

}
