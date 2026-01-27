package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/works-on-my-machine-390/concordia-waze/internal/application"
	"github.com/works-on-my-machine-390/concordia-waze/internal/domain"
	"github.com/works-on-my-machine-390/concordia-waze/internal/presentation/middleware"
)

// AuthHandler handles authentication requests
type AuthHandler struct {
	userService *application.UserService
}

// NewAuthHandler creates a new auth handler
func NewAuthHandler(userService *application.UserService) *AuthHandler {
	return &AuthHandler{
		userService: userService,
	}
}

// SignUpRequest is the request body for sign up
type SignUpRequest struct {
	Name      string `json:"name" binding:"required"`
	StudentID string `json:"student_id" binding:"required"`
	Email     string `json:"email" binding:"required,email"`
	Password  string `json:"password" binding:"required,min=6"`
}

// LoginRequest is the request body for login
type LoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

// AuthResponse is the response for auth endpoints
type AuthResponse struct {
	ID        string      `json:"id"`
	Name      string      `json:"name"`
	StudentID string      `json:"student_id"`
	Email     string      `json:"email"`
	Token     string      `json:"token,omitempty"`
}

// SignUp handles user registration
func (h *AuthHandler) SignUp(c *gin.Context) {
	var req SignUpRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	user, token, err := h.userService.SignUp(req.Name, req.StudentID, req.Email, req.Password)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	response := AuthResponse{
		ID:        user.ID,
		Name:      user.Name,
		StudentID: user.StudentID,
		Email:     user.Email,
		Token:     token,
	}

	c.JSON(http.StatusCreated, response)
}

// Login handles user authentication
func (h *AuthHandler) Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

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
		ID:        user.ID,
		Name:      user.Name,
		StudentID: user.StudentID,
		Email:     user.Email,
		Token:     token,
	}

	c.JSON(http.StatusOK, response)
}

// GetProfile returns the authenticated user's profile
func (h *AuthHandler) GetProfile(c *gin.Context) {
	claims := middleware.GetUserFromContext(c)
	if claims == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "not authenticated"})
		return
	}

	user, err := h.userService.GetUserByID(claims.ID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	response := AuthResponse{
		ID:        user.ID,
		Name:      user.Name,
		StudentID: user.StudentID,
		Email:     user.Email,
	}

	c.JSON(http.StatusOK, response)
}

// func (h *AuthHandler) LogOut(c *gin.Context) {

// }
