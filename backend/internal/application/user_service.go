package application

import (
	"crypto/sha256"
	"fmt"
	"sync"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/works-on-my-machine-390/concordia-waze/internal/domain"
	"github.com/works-on-my-machine-390/concordia-waze/internal/persistence/repository"
)

type JWTManager struct {
	secretKey      string
	duration       time.Duration
	revokedTokens  map[string]time.Time // token -> expiration time
	revokedTokenMu sync.RWMutex
}

func NewJWTManager(secretKey string, duration time.Duration) *JWTManager {
	if secretKey == "" {
		secretKey = "your-secret-key-change-in-production"
	}
	return &JWTManager{
		secretKey:     secretKey,
		duration:      duration,
		revokedTokens: make(map[string]time.Time),
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
	// Check if token is revoked
	m.revokedTokenMu.RLock()
	if expTime, exists := m.revokedTokens[tokenString]; exists {
		m.revokedTokenMu.RUnlock()
		// Token is revoked and still in the list
		if time.Now().Before(expTime) {
			return nil, domain.ErrInvalidToken
		}
		// Clean up expired revoked token
		m.revokedTokenMu.RUnlock()
		m.revokedTokenMu.Lock()
		delete(m.revokedTokens, tokenString)
		m.revokedTokenMu.Unlock()
		m.revokedTokenMu.RLock()
	}
	m.revokedTokenMu.RUnlock()

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

// RevokeToken adds a token to the revocation list
func (m *JWTManager) RevokeToken(token string, expiration time.Time) {
	m.revokedTokenMu.Lock()
	defer m.revokedTokenMu.Unlock()
	m.revokedTokens[token] = expiration
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

// Logout revokes a token
func (s *UserService) Logout(token string, expiration time.Time) error {
	s.jwtManager.RevokeToken(token, expiration)
	return nil
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

