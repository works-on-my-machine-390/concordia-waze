package application_test

import (
	"testing"
	"time"

	"github.com/works-on-my-machine-390/concordia-waze/internal/application"
	"github.com/works-on-my-machine-390/concordia-waze/internal/domain"
	"github.com/works-on-my-machine-390/concordia-waze/internal/persistence/repository"
)

func TestSignUpSuccess(t *testing.T) {
	repo := repository.NewInMemoryUserRepository()
	jwtManager := application.NewJWTManager("test-secret", time.Hour)
	service := application.NewUserService(repo, jwtManager)

	user, token, err := service.SignUp(
		"John Doe",
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

func TestSignUpEmptyName(t *testing.T) {
	repo := repository.NewInMemoryUserRepository()
	jwtManager := application.NewJWTManager("test-secret", time.Hour)
	service := application.NewUserService(repo, jwtManager)

	_, _, err := service.SignUp(
		"",
		"john.doe@concordia.ca",
		"password123",
	)

	if err != domain.ErrEmptyName {
		t.Errorf("Expected ErrEmptyName, got %v", err)
	}
}

func TestSignUpEmptyPassword(t *testing.T) {
	repo := repository.NewInMemoryUserRepository()
	jwtManager := application.NewJWTManager("test-secret", time.Hour)
	service := application.NewUserService(repo, jwtManager)

	_, _, err := service.SignUp(
		"John Doe",
		"john.doe@concordia.ca",
		"",
	)

	if err != domain.ErrEmptyPassword {
		t.Errorf("Expected ErrEmptyPassword, got %v", err)
	}
}

func TestLoginSuccess(t *testing.T) {
	repo := repository.NewInMemoryUserRepository()
	jwtManager := application.NewJWTManager("test-secret", time.Hour)
	service := application.NewUserService(repo, jwtManager)

	// Signup first
	_, _, err := service.SignUp(
		"John Doe",
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

func TestLoginWrongPassword(t *testing.T) {
	repo := repository.NewInMemoryUserRepository()
	jwtManager := application.NewJWTManager("test-secret", time.Hour)
	service := application.NewUserService(repo, jwtManager)

	// Signup
	_, _, err := service.SignUp(
		"John Doe",
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

func TestLoginUserNotFound(t *testing.T) {
	repo := repository.NewInMemoryUserRepository()
	jwtManager := application.NewJWTManager("test-secret", time.Hour)
	service := application.NewUserService(repo, jwtManager)

	_, _, err := service.Login("nonexistent@concordia.ca", "password123")

	if err != domain.ErrInvalidCredentials {
		t.Errorf("Expected ErrInvalidCredentials, got %v", err)
	}
}

func TestJWTManagerGenerateAndValidateToken(t *testing.T) {
	jwtManager := application.NewJWTManager("test-secret", time.Hour)
	user := &domain.User{
		ID:    "user-123",
		Name:  "John Doe",
		Email: "john.doe@concordia.ca",
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
	if claims.Email != user.Email {
		t.Errorf("Expected email %s, got %s", user.Email, claims.Email)
	}
}

func TestJWTManagerInvalidToken(t *testing.T) {
	jwtManager := application.NewJWTManager("test-secret", time.Hour)

	_, err := jwtManager.ValidateToken("invalid.token.here")

	if err != domain.ErrInvalidToken {
		t.Errorf("Expected ErrInvalidToken, got %v", err)
	}
}

func TestJWTManagerWrongSecret(t *testing.T) {
	jwtManager1 := application.NewJWTManager("secret-1", time.Hour)
	jwtManager2 := application.NewJWTManager("secret-2", time.Hour)

	user := &domain.User{
		ID:    "user-123",
		Email: "john.doe@concordia.ca",
	}

	// Generate with secret-1
	token, _ := jwtManager1.GenerateToken(user)

	// Try to validate with secret-2
	_, err := jwtManager2.ValidateToken(token)

	if err != domain.ErrInvalidToken {
		t.Errorf("Expected ErrInvalidToken, got %v", err)
	}
}

func TestJWTManagerRevokeToken(t *testing.T) {
	jwtManager := application.NewJWTManager("test-secret", time.Hour)
	user := &domain.User{
		ID:    "user-123",
		Email: "john.doe@concordia.ca",
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

func TestUserServiceLogout(t *testing.T) {
	repo := repository.NewInMemoryUserRepository()
	jwtManager := application.NewJWTManager("test-secret", time.Hour)
	service := application.NewUserService(repo, jwtManager)

	// Signup
	_, token, err := service.SignUp(
		"John Doe",
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

func TestUserServiceSameEmailSignUp(t *testing.T) {
	repo := repository.NewInMemoryUserRepository()
	jwtManager := application.NewJWTManager("test-secret", time.Hour)
	service := application.NewUserService(repo, jwtManager)

	_, _, err := service.SignUp(
		"john",
		"john.doe@concordia.ca",
		"password123",
	)
	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}

	_, _, err = service.SignUp(
		"john2",
		"john.doe@concordia.ca",
		"password123",
	)

	if err != domain.ErrUserAlreadyExists {
		t.Errorf("Expected ErrUserAlreadyExists, got %v", err)
	}

}

func TestGenerateTokenForUserSuccess(t *testing.T) {
	repo := repository.NewInMemoryUserRepository()
	jwtManager := application.NewJWTManager("test-secret", time.Hour)
	service := application.NewUserService(repo, jwtManager)

	user := &domain.User{
		ID:    "user-123",
		Name:  "John Doe",
		Email: "john@example.com",
	}

	token, err := service.GenerateTokenForUser(user)
	if err != nil {
		t.Fatalf("GenerateTokenForUser failed: %v", err)
	}

	if token == "" {
		t.Fatal("Expected non-empty token")
	}

	// Verify token is valid
	claims, err := jwtManager.ValidateToken(token)
	if err != nil {
		t.Fatalf("ValidateToken failed: %v", err)
	}

	if claims.ID != "user-123" {
		t.Errorf("Expected ID 'user-123', got %s", claims.ID)
	}

	if claims.Email != "john@example.com" {
		t.Errorf("Expected email 'john@example.com', got %s", claims.Email)
	}
}

func TestGetUserByIDSuccess(t *testing.T) {
	repo := repository.NewInMemoryUserRepository()
	user := &domain.User{ID: "user-123", Name: "John", Email: "john@example.com", Password: "hash"}
	repo.Create(user)

	jwtManager := application.NewJWTManager("test-secret", time.Hour)
	service := application.NewUserService(repo, jwtManager)

	retrieved, err := service.GetUserByID("user-123")
	if err != nil {
		t.Fatalf("GetUserByID failed: %v", err)
	}

	if retrieved.ID != "user-123" || retrieved.Name != "John" {
		t.Fatal("Retrieved user doesn't match original")
	}
}

func TestGetUserByIDNotFound(t *testing.T) {
	repo := repository.NewInMemoryUserRepository()
	jwtManager := application.NewJWTManager("test-secret", time.Hour)
	service := application.NewUserService(repo, jwtManager)

	_, err := service.GetUserByID("nonexistent")
	if err == nil {
		t.Fatal("Expected error for non-existent user")
	}
}

func TestGetUserByEmailSuccess(t *testing.T) {
	repo := repository.NewInMemoryUserRepository()
	user := &domain.User{ID: "user-123", Name: "John", Email: "john@example.com", Password: "hash"}
	repo.Create(user)

	jwtManager := application.NewJWTManager("test-secret", time.Hour)
	service := application.NewUserService(repo, jwtManager)

	retrieved, err := service.GetUserByEmail("john@example.com")
	if err != nil {
		t.Fatalf("GetUserByEmail failed: %v", err)
	}

	if retrieved.Email != "john@example.com" {
		t.Fatal("Retrieved user doesn't match original")
	}
}

func TestGetUserByEmailNotFound(t *testing.T) {
	repo := repository.NewInMemoryUserRepository()
	jwtManager := application.NewJWTManager("test-secret", time.Hour)
	service := application.NewUserService(repo, jwtManager)

	_, err := service.GetUserByEmail("nonexistent@example.com")
	if err == nil {
		t.Fatal("Expected error for non-existent email")
	}
}

func TestLogoutSuccess(t *testing.T) {
	repo := repository.NewInMemoryUserRepository()
	jwtManager := application.NewJWTManager("test-secret", time.Hour)
	service := application.NewUserService(repo, jwtManager)

	user := &domain.User{ID: "user-123", Name: "John", Email: "john@example.com"}
	token, _ := jwtManager.GenerateToken(user)

	// Token should be valid before logout
	_, err := jwtManager.ValidateToken(token)
	if err != nil {
		t.Fatal("Token should be valid before logout")
	}

	// Logout
	expiration := time.Now().Add(1 * time.Hour)
	err = service.Logout(token, expiration)
	if err != nil {
		t.Fatalf("Logout failed: %v", err)
	}

	// Token should be invalid after logout
	_, err = jwtManager.ValidateToken(token)
	if err == nil {
		t.Fatal("Token should be invalid after logout")
	}
}

func TestLoginPasswordVerification(t *testing.T) {
	repo := repository.NewInMemoryUserRepository()
	jwtManager := application.NewJWTManager("test-secret", time.Hour)
	service := application.NewUserService(repo, jwtManager)

	// Sign up and login with correct password
	service.SignUp("John Doe", "john@example.com", "password123")

	user, token, err := service.Login("john@example.com", "password123")
	if err != nil {
		t.Fatalf("Login with correct password failed: %v", err)
	}

	if user == nil || token == "" {
		t.Fatal("Login should return user and token")
	}

	// Verify password hash doesn't match plaintext
	if user.Password == "password123" {
		t.Fatal("Password should be hashed, not plaintext")
	}
}

func TestLoginInvalidCredentials(t *testing.T) {
	repo := repository.NewInMemoryUserRepository()
	jwtManager := application.NewJWTManager("test-secret", time.Hour)
	service := application.NewUserService(repo, jwtManager)

	// Sign up
	service.SignUp("John Doe", "john@example.com", "password123")

	// Login with wrong password
	_, _, err := service.Login("john@example.com", "wrongpassword")
	if err != domain.ErrInvalidCredentials {
		t.Errorf("Expected ErrInvalidCredentials, got %v", err)
	}
}

func TestLoginEmptyEmail(t *testing.T) {
	repo := repository.NewInMemoryUserRepository()
	jwtManager := application.NewJWTManager("test-secret", time.Hour)
	service := application.NewUserService(repo, jwtManager)

	_, _, err := service.Login("", "password123")
	if err != domain.ErrEmptyEmail {
		t.Errorf("Expected ErrEmptyEmail, got %v", err)
	}
}

func TestLoginEmptyPassword(t *testing.T) {
	repo := repository.NewInMemoryUserRepository()
	jwtManager := application.NewJWTManager("test-secret", time.Hour)
	service := application.NewUserService(repo, jwtManager)

	_, _, err := service.Login("john@example.com", "")
	if err != domain.ErrEmptyPassword {
		t.Errorf("Expected ErrEmptyPassword, got %v", err)
	}
}
