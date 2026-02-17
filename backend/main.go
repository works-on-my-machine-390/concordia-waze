package main

import (
	"context"
	"log"
	"os"

	"github.com/joho/godotenv"
	_ "github.com/works-on-my-machine-390/concordia-waze/docs"
	"github.com/works-on-my-machine-390/concordia-waze/internal/application/firebase"
	"github.com/works-on-my-machine-390/concordia-waze/internal/router"
)

func main() {
	_ = godotenv.Load()

	// ✅ Local-only bypass
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
