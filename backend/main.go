package main

import (
	_ "github.com/works-on-my-machine-390/concordia-waze/docs"
	"github.com/works-on-my-machine-390/concordia-waze/internal/router"
)

// @title Concordia Waze API
// @version 1.0
// @description This is the Concordia Waze API server.
// @host localhost:8080
// @BasePath /

func main() {

	router := router.SetupRouter()
	router.Run("localhost:8080")

}
