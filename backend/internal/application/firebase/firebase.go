package firebase

import (
	"context"
	"fmt"
	"os"

	"cloud.google.com/go/firestore"
	firebase "firebase.google.com/go/v4"
	"google.golang.org/api/option"
)

var firestoreClient *firestore.Client

// Initialize sets up the Firebase Admin SDK for backend access.
func Initialize(ctx context.Context) error {
	// Check if using emulator
	if os.Getenv("FIRESTORE_EMULATOR_HOST") != "" {
		// For emulator, we don't need credentials but do need a project ID
		projectID := os.Getenv("GCLOUD_PROJECT")
		if projectID == "" {
			projectID = "demo-test-project"
		}

		conf := &firebase.Config{ProjectID: projectID}
		app, err := firebase.NewApp(ctx, conf)
		if err != nil {
			return fmt.Errorf("initialize firebase app: %w", err)
		}

		client, err := app.Firestore(ctx)
		if err != nil {
			return fmt.Errorf("initialize firestore client: %w", err)
		}

		firestoreClient = client
		return nil
	}

	// Use service account credentials for real Firebase
	credentialsPath := os.Getenv("FIREBASE_CREDENTIALS_PATH")
	if credentialsPath == "" {
		credentialsPath = "./serviceAccountKey.json"
	}

	app, err := firebase.NewApp(ctx, nil, option.WithCredentialsFile(credentialsPath))
	if err != nil {
		return fmt.Errorf("initialize firebase app: %w", err)
	}

	client, err := app.Firestore(ctx)
	if err != nil {
		return fmt.Errorf("initialize firestore client: %w", err)
	}

	firestoreClient = client
	return nil
}

// GetClient returns the initialized Firestore client.
func GetClient() *firestore.Client {
	return firestoreClient
}

// Close closes the Firestore client.
func Close(ctx context.Context) error {
	if firestoreClient != nil {
		return firestoreClient.Close()
	}
	return nil
}
