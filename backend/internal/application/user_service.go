package application

import (
	"crypto/sha256"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/works-on-my-machine-390/concordia-waze/internal/domain"
	"github.com/works-on-my-machine-390/concordia-waze/internal/persistence/repository"
)

type JWTManager struct {
	secretKey string
	duration  time.Duration
}


func NewJWTManager(secretKey string, duration time.Duration) *JWTManager {
	if secretKey == "" {
		secretKey = "your-secret-key-change-in-production"
	}
	return &JWTManager{
		secretKey: secretKey,
		duration:  duration,
	}
}


func (m *JWTManager) GenerateToken(user *domain.User) (string, error) {
	claims := jwt.MapClaims{
		"id":         user.ID,
		"student_id": user.StudentID,
		"email":      user.Email,
		"exp":        time.Now().Add(m.duration).Unix(),
		"iat":        time.Now().Unix(),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(m.secretKey))
}

func (m *JWTManager) ValidateToken(tokenString string) (*domain.UserClaims, error) {
	claims := jwt.MapClaims{}

	token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
		// Verify signing method
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, domain.ErrInvalidToken
		}
		return []byte(m.secretKey), nil
	})

	if err != nil || !token.Valid {
		return nil, domain.ErrInvalidToken
	}

	userClaims := &domain.UserClaims{
		ID:        claims["id"].(string),
		StudentID: claims["student_id"].(string),
		Email:     claims["email"].(string),
	}

	return userClaims, nil
}

// UserService handles user-related business logic
type UserService struct {
	repo       repository.UserRepository
	jwtManager *JWTManager
}

// NewUserService creates a new user service
func NewUserService(repo repository.UserRepository, jwtManager *JWTManager) *UserService {
	return &UserService{
		repo:       repo,
		jwtManager: jwtManager,
	}
}

// SignUp registers a new student
func (s *UserService) SignUp(name, studentID, email, password string) (*domain.User, string, error) {
	// Validation
	if name == "" {
		return nil, "", domain.ErrEmptyName
	}
	if studentID == "" {
		return nil, "", domain.ErrEmptyStudentID
	}
	if email == "" {
		return nil, "", domain.ErrEmptyEmail
	}
	if !isValidConcordiaEmail(email) {
		return nil, "", domain.ErrInvalidEmail
	}
	if password == "" {
		return nil, "", domain.ErrEmptyPassword
	}

	// Hash password
	hashedPassword := hashPassword(password)

	// Create user
	user := &domain.User{
		Name:      name,
		StudentID: studentID,
		Email:     email,
		Password:  hashedPassword,
	}

	// Save to repository
	if err := s.repo.Create(user); err != nil {
		return nil, "", err
	}

	// Generate token
	token, err := s.jwtManager.GenerateToken(user)
	if err != nil {
		return nil, "", err
	}

	return user, token, nil
}

// Login authenticates a user
func (s *UserService) Login(email, password string) (*domain.User, string, error) {
	// Validation
	if email == "" {
		return nil, "", domain.ErrEmptyEmail
	}
	if password == "" {
		return nil, "", domain.ErrEmptyPassword
	}

	// Find user by email
	user, err := s.repo.FindByEmail(email)
	if err != nil {
		return nil, "", domain.ErrInvalidCredentials
	}

	// Verify password
	if !verifyPassword(user.Password, password) {
		return nil, "", domain.ErrInvalidCredentials
	}

	// Generate token
	token, err := s.jwtManager.GenerateToken(user)
	if err != nil {
		return nil, "", err
	}

	return user, token, nil
}

// GetUserByID retrieves a user by ID
func (s *UserService) GetUserByID(id string) (*domain.User, error) {
	return s.repo.FindByID(id)
}

// GetUserByEmail retrieves a user by email
func (s *UserService) GetUserByEmail(email string) (*domain.User, error) {
	return s.repo.FindByEmail(email)
}

// hashPassword creates a simple hash (use bcrypt in production)
func hashPassword(password string) string {
	hash := sha256.Sum256([]byte(password))
	return fmt.Sprintf("%x", hash)
}

// verifyPassword checks if a password matches its hash
func verifyPassword(hashedPassword, password string) bool {
	return hashPassword(password) == hashedPassword
}

// isValidConcordiaEmail checks if email ends with concordia.ca
func isValidConcordiaEmail(email string) bool {
	const concordiaSuffix = "concordia.ca"
	if len(email) < len(concordiaSuffix) {
		return false
	}
	return email[len(email)-len(concordiaSuffix):] == concordiaSuffix
}
