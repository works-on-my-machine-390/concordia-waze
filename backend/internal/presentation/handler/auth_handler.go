package handler

import (
	"context"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/works-on-my-machine-390/concordia-waze/internal/application"
	"github.com/works-on-my-machine-390/concordia-waze/internal/domain"
	"github.com/works-on-my-machine-390/concordia-waze/internal/presentation/middleware"
	"golang.org/x/crypto/bcrypt"
)

// AuthHandler handles authentication requests
type AuthHandler struct {
	userService     *application.UserService
	firebaseService FirebaseProfileService
}

// FirebaseProfileService defines user profile operations stored in Firestore.
type FirebaseProfileService interface {
	CreateUserProfile(ctx context.Context, userID string, profile application.User) error
	GetUserProfile(ctx context.Context, userID string) (*application.User, error)
	GetUserProfileByEmail(ctx context.Context, email string) (*application.User, error)
}

// NewAuthHandler creates a new auth handler
func NewAuthHandler(userService *application.UserService, firebaseService FirebaseProfileService) *AuthHandler {
	return &AuthHandler{
		userService:     userService,
		firebaseService: firebaseService,
	}
}

// SignUpRequest is the request body for sign up
type SignUpRequest struct {
	Name     string `json:"name" binding:"required"`
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=6"`
}

// LoginRequest is the request body for login
type LoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

// AuthResponse is the response for auth endpoints
type AuthResponse struct {
	ID    string `json:"id"`
	Name  string `json:"name"`
	Email string `json:"email"`
	Token string `json:"token,omitempty"`
}

// SignUp handles user registration
// @Summary Register a new user
// @Description Create a new user account with name, email, and password
// @Tags auth
// @Accept json
// @Produce json
// @Param request body SignUpRequest true "Sign up details"
// @Success 201 {object} AuthResponse
// @Failure 400 {object} map[string]string "Validation error"
// @Failure 409 {object} map[string]string "User already exists"
// @Router /auth/signup [post]
func (h *AuthHandler) SignUp(c *gin.Context) {
	var req SignUpRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	user, token, err := h.userService.SignUp(req.Name, req.Email, req.Password)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	response := AuthResponse{
		ID:    user.ID,
		Name:  user.Name,
		Email: user.Email,
		Token: token,
	}

	if h.firebaseService != nil {
		// Hash password with bcrypt
		hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to hash password"})
			return
		}

		profile := application.User{
			UserID:    user.ID,
			Email:     user.Email,
			FirstName: user.Name,
			LastName:  "",
			Password:  string(hashedPassword),
		}
		if err := h.firebaseService.CreateUserProfile(c.Request.Context(), user.ID, profile); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
	}

	c.JSON(http.StatusCreated, response)
}

// Login handles user authentication
// @Summary Login user
// @Description Authenticate a user with email and password, receive JWT token
// @Tags auth
// @Accept json
// @Produce json
// @Param request body LoginRequest true "Login credentials"
// @Success 200 {object} AuthResponse
// @Failure 400 {object} map[string]string "Validation error"
// @Failure 401 {object} map[string]string "Invalid credentials"
// @Router /auth/login [post]
func (h *AuthHandler) Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Check Firestore for user authentication if Firebase service is available
	if h.firebaseService != nil {
		profile, err := h.firebaseService.GetUserProfileByEmail(c.Request.Context(), req.Email)
		if err != nil || profile == nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
			return
		}

		// Verify password with bcrypt
		if err := bcrypt.CompareHashAndPassword([]byte(profile.Password), []byte(req.Password)); err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
			return
		}

		// Create a domain.User to generate token
		user := &domain.User{
			ID:    profile.UserID,
			Email: profile.Email,
			Name:  profile.FirstName + " " + profile.LastName,
		}

		token, err := h.userService.GenerateTokenForUser(user)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
			return
		}

		response := AuthResponse{
			ID:    profile.UserID,
			Name:  profile.FirstName + " " + profile.LastName,
			Email: profile.Email,
			Token: token,
		}

		c.JSON(http.StatusOK, response)
		return
	}

	// Fallback to in-memory user service
	user, token, err := h.userService.Login(req.Email, req.Password)
	if err != nil {
		if err == domain.ErrInvalidCredentials {
			c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		} else {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		}
		return
	}

	response := AuthResponse{
		ID:    user.ID,
		Name:  user.Name,
		Email: user.Email,
		Token: token,
	}

	c.JSON(http.StatusOK, response)
}

// GetProfile returns the authenticated user's profile
// @Summary Get user profile
// @Description Get the authenticated user's information
// @Tags auth
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param Authorization header string true "Bearer token"
// @Success 200 {object} AuthResponse
// @Failure 401 {object} map[string]string "Not authenticated"
// @Failure 404 {object} map[string]string "User not found"
// @Router /auth/profile [get]
func (h *AuthHandler) GetProfile(c *gin.Context) {
	claims := middleware.GetUserFromContext(c)
	if claims == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "not authenticated"})
		return
	}

	var profile *application.User
	if h.firebaseService != nil {
		user, err := h.firebaseService.GetUserProfile(c.Request.Context(), claims.ID)
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
			return
		}
		profile = user
	}

	if profile == nil {
		user, err := h.userService.GetUserByID(claims.ID)
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
			return
		}
		profile = &application.User{
			UserID:    user.ID,
			Email:     user.Email,
			FirstName: user.Name,
			LastName:  "",
		}
	}
	fullName := strings.TrimSpace(strings.Join([]string{profile.FirstName, profile.LastName}, " "))

	response := AuthResponse{
		ID:    profile.UserID,
		Name:  fullName,
		Email: profile.Email,
	}

	c.JSON(http.StatusOK, response)
}

// Logout handles user logout
// @Summary Logout user
// @Description Logout the authenticated user and revoke their token
// @Tags auth
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param Authorization header string true "Bearer token"
// @Success 200 {object} map[string]string "Logout successful"
// @Failure 401 {object} map[string]string "Not authenticated"
// @Router /auth/logout [post]
func (h *AuthHandler) Logout(c *gin.Context) {
	claims := middleware.GetUserFromContext(c)
	if claims == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "not authenticated"})
		return
	}

	// Get token from Authorization header
	authHeader := c.GetHeader("Authorization")
	if authHeader == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "missing authorization header"})
		return
	}

	// Extract token (format: "Bearer <token>")
	var token string
	if len(authHeader) > 7 && authHeader[:7] == "Bearer " {
		token = authHeader[7:]
	} else {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid authorization header format"})
		return
	}

	// Logout (revoke token)
	h.userService.Logout(token, c.GetTime("token_exp"))

	c.JSON(http.StatusOK, gin.H{"message": "logged out successfully"})
}
