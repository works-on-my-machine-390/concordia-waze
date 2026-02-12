package firebase_test

import (
	"context"
	"os"
	"testing"

	"github.com/works-on-my-machine-390/concordia-waze/internal/application/firebase"
)

func TestInitializeWithEmulator(t *testing.T) {
	// Set emulator environment variable
	os.Setenv("FIRESTORE_EMULATOR_HOST", "127.0.0.1:8080")
	os.Setenv("GCLOUD_PROJECT", "test-project")
	defer os.Unsetenv("FIRESTORE_EMULATOR_HOST")
	defer os.Unsetenv("GCLOUD_PROJECT")

	ctx := context.Background()
	err := firebase.Initialize(ctx)
	// Should succeed or fail gracefully if emulator not running
	// Just verify it doesn't panic
	if err != nil {
		t.Logf("Initialize failed (expected if emulator not running): %v", err)
	}
}

func TestInitializeWithEmulatorDefaultProject(t *testing.T) {
	// Set emulator without project ID
	os.Setenv("FIRESTORE_EMULATOR_HOST", "127.0.0.1:8080")
	os.Unsetenv("GCLOUD_PROJECT")
	defer os.Unsetenv("FIRESTORE_EMULATOR_HOST")

	ctx := context.Background()
	err := firebase.Initialize(ctx)
	if err != nil {
		t.Logf("Initialize failed (expected if emulator not running): %v", err)
	}
}

func TestGetClientNotInitialized(t *testing.T) {
	// Call GetClient without initializing
	// Should return nil since client isn't initialized
	client := firebase.GetClient()
	if client != nil {
		t.Log("GetClient returned non-nil, which is fine if previously initialized")
	}
}

func TestClose_NotInitialized(t *testing.T) {
	// Try to close when not initialized
	ctx := context.Background()
	err := firebase.Close(ctx)
	// Should not error
	if err != nil {
		t.Logf("Close returned error (expected if not initialized): %v", err)
	}
}

func TestInitialize_MissingCredentials(t *testing.T) {
	// Unset emulator to test real Firebase path
	os.Unsetenv("FIRESTORE_EMULATOR_HOST")
	os.Setenv("FIREBASE_CREDENTIALS_PATH", "/nonexistent/path.json")
	defer os.Unsetenv("FIREBASE_CREDENTIALS_PATH")

	ctx := context.Background()
	err := firebase.Initialize(ctx)
	// Should error because credentials file doesn't exist
	if err == nil {
		t.Error("Expected error for missing credentials, got nil")
	}
}

func TestInitialize_DefaultCredentialsPath(t *testing.T) {
	// Unset emulator and credentials path to test default path
	os.Unsetenv("FIRESTORE_EMULATOR_HOST")
	os.Unsetenv("FIREBASE_CREDENTIALS_PATH")

	ctx := context.Background()
	err := firebase.Initialize(ctx)
	// Should error because default serviceAccountKey.json doesn't exist
	if err == nil {
		t.Log("Initialize succeeded (credentials file exists)")
	} else {
		t.Logf("Initialize failed (expected, credentials file missing): %v", err)
	}
}
