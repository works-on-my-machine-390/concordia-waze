package application_test

import (
	"testing"
	"time"

	"github.com/works-on-my-machine-390/concordia-waze/internal/application"
	"github.com/works-on-my-machine-390/concordia-waze/internal/domain"
	"github.com/works-on-my-machine-390/concordia-waze/internal/persistence/repository"
)

func TestSignUp_Success(t *testing.T) {
	repo := repository.NewInMemoryUserRepository()
	jwtManager := application.NewJWTManager("test-secret", time.Hour)
	service := application.NewUserService(repo, jwtManager)

	user, token, err := service.SignUp(
		"John Doe",
		"40123456",
		"john.doe@concordia.ca",
		"password123",
	)

	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}
	if user == nil {
		t.Fatal("Expected user, got nil")
	}
	if token == "" {
		t.Fatal("Expected token, got empty string")
	}
	if user.Name != "John Doe" {
		t.Errorf("Expected name 'John Doe', got %s", user.Name)
	}
	if user.Email != "john.doe@concordia.ca" {
		t.Errorf("Expected email 'john.doe@concordia.ca', got %s", user.Email)
	}
}

func TestSignUp_InvalidEmail(t *testing.T) {
	repo := repository.NewInMemoryUserRepository()
	jwtManager := application.NewJWTManager("test-secret", time.Hour)
	service := application.NewUserService(repo, jwtManager)

	tests := []struct {
		name  string
		email string
	}{
		{"non-concordia email", "john@gmail.com"},
		{"missing domain", "john@"},
		{"wrong domain", "john@utoronto.ca"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, _, err := service.SignUp(
				"John Doe",
				"40123456",
				tt.email,
				"password123",
			)

			if err != domain.ErrInvalidEmail {
				t.Errorf("Expected ErrInvalidEmail, got %v", err)
			}
		})
	}
}

func TestSignUp_EmptyName(t *testing.T) {
	repo := repository.NewInMemoryUserRepository()
	jwtManager := application.NewJWTManager("test-secret", time.Hour)
	service := application.NewUserService(repo, jwtManager)

	_, _, err := service.SignUp(
		"",
		"40123456",
		"john.doe@concordia.ca",
		"password123",
	)

	if err != domain.ErrEmptyName {
		t.Errorf("Expected ErrEmptyName, got %v", err)
	}
}

func TestSignUp_EmptyPassword(t *testing.T) {
	repo := repository.NewInMemoryUserRepository()
	jwtManager := application.NewJWTManager("test-secret", time.Hour)
	service := application.NewUserService(repo, jwtManager)

	_, _, err := service.SignUp(
		"John Doe",
		"40123456",
		"john.doe@concordia.ca",
		"",
	)

	if err != domain.ErrEmptyPassword {
		t.Errorf("Expected ErrEmptyPassword, got %v", err)
	}
}

func TestLogin_Success(t *testing.T) {
	repo := repository.NewInMemoryUserRepository()
	jwtManager := application.NewJWTManager("test-secret", time.Hour)
	service := application.NewUserService(repo, jwtManager)

	// Signup first
	_, _, err := service.SignUp(
		"John Doe",
		"40123456",
		"john.doe@concordia.ca",
		"password123",
	)
	if err != nil {
		t.Fatalf("Signup failed: %v", err)
	}

	// Login
	user, token, err := service.Login("john.doe@concordia.ca", "password123")

	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}
	if user == nil {
		t.Fatal("Expected user, got nil")
	}
	if token == "" {
		t.Fatal("Expected token, got empty string")
	}
}

func TestLogin_WrongPassword(t *testing.T) {
	repo := repository.NewInMemoryUserRepository()
	jwtManager := application.NewJWTManager("test-secret", time.Hour)
	service := application.NewUserService(repo, jwtManager)

	// Signup
	_, _, err := service.SignUp(
		"John Doe",
		"40123456",
		"john.doe@concordia.ca",
		"password123",
	)
	if err != nil {
		t.Fatalf("Signup failed: %v", err)
	}

	// Login with wrong password
	_, _, err = service.Login("john.doe@concordia.ca", "wrongpassword")

	if err != domain.ErrInvalidCredentials {
		t.Errorf("Expected ErrInvalidCredentials, got %v", err)
	}
}

func TestLogin_UserNotFound(t *testing.T) {
	repo := repository.NewInMemoryUserRepository()
	jwtManager := application.NewJWTManager("test-secret", time.Hour)
	service := application.NewUserService(repo, jwtManager)

	_, _, err := service.Login("nonexistent@concordia.ca", "password123")

	if err != domain.ErrInvalidCredentials {
		t.Errorf("Expected ErrInvalidCredentials, got %v", err)
	}
}

func TestJWTManager_GenerateAndValidateToken(t *testing.T) {
	jwtManager := application.NewJWTManager("test-secret", time.Hour)
	user := &domain.User{
		ID:        "user-123",
		Name:      "John Doe",
		StudentID: "40123456",
		Email:     "john.doe@concordia.ca",
	}

	// Generate token
	token, err := jwtManager.GenerateToken(user)
	if err != nil {
		t.Fatalf("Token generation failed: %v", err)
	}

	// Validate token
	claims, err := jwtManager.ValidateToken(token)
	if err != nil {
		t.Fatalf("Token validation failed: %v", err)
	}

	if claims.ID != user.ID {
		t.Errorf("Expected ID %s, got %s", user.ID, claims.ID)
	}
	if claims.StudentID != user.StudentID {
		t.Errorf("Expected StudentID %s, got %s", user.StudentID, claims.StudentID)
	}
	if claims.Email != user.Email {
		t.Errorf("Expected email %s, got %s", user.Email, claims.Email)
	}
}

func TestJWTManager_InvalidToken(t *testing.T) {
	jwtManager := application.NewJWTManager("test-secret", time.Hour)

	_, err := jwtManager.ValidateToken("invalid.token.here")

	if err != domain.ErrInvalidToken {
		t.Errorf("Expected ErrInvalidToken, got %v", err)
	}
}

func TestJWTManager_WrongSecret(t *testing.T) {
	jwtManager1 := application.NewJWTManager("secret-1", time.Hour)
	jwtManager2 := application.NewJWTManager("secret-2", time.Hour)

	user := &domain.User{
		ID:        "user-123",
		StudentID: "40123456",
		Email:     "john.doe@concordia.ca",
	}

	// Generate with secret-1
	token, _ := jwtManager1.GenerateToken(user)

	// Try to validate with secret-2
	_, err := jwtManager2.ValidateToken(token)

	if err != domain.ErrInvalidToken {
		t.Errorf("Expected ErrInvalidToken, got %v", err)
	}
}

func TestJWTManager_RevokeToken(t *testing.T) {
	jwtManager := application.NewJWTManager("test-secret", time.Hour)
	user := &domain.User{
		ID:        "user-123",
		StudentID: "40123456",
		Email:     "john.doe@concordia.ca",
	}

	// Generate token
	token, _ := jwtManager.GenerateToken(user)

	// Validate token (should work)
	_, err := jwtManager.ValidateToken(token)
	if err != nil {
		t.Fatalf("Token validation failed: %v", err)
	}

	// Revoke token
	jwtManager.RevokeToken(token, time.Now().Add(time.Hour))

	// Try to validate revoked token
	_, err = jwtManager.ValidateToken(token)
	if err != domain.ErrInvalidToken {
		t.Errorf("Expected ErrInvalidToken for revoked token, got %v", err)
	}
}

func TestUserService_Logout(t *testing.T) {
	repo := repository.NewInMemoryUserRepository()
	jwtManager := application.NewJWTManager("test-secret", time.Hour)
	service := application.NewUserService(repo, jwtManager)

	// Signup
	_, token, err := service.SignUp(
		"John Doe",
		"40123456",
		"john.doe@concordia.ca",
		"password123",
	)
	if err != nil {
		t.Fatalf("SignUp failed: %v", err)
	}

	// Logout
	expTime := time.Now().Add(time.Hour)
	err = service.Logout(token, expTime)
	if err != nil {
		t.Fatalf("Logout failed: %v", err)
	}

	// Token should be revoked
	_, err = jwtManager.ValidateToken(token)
	if err != domain.ErrInvalidToken {
		t.Errorf("Expected ErrInvalidToken after logout, got %v", err)
	}
}
