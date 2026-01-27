package domain

import "errors"

var (
	// Auth errors
	ErrInvalidCredentials = errors.New("Invalid email or password")
	ErrUserNotFound       = errors.New("User not found")
	ErrInvalidToken       = errors.New("Invalid or expired token")
	ErrMissingToken       = errors.New("Missing authorization token")
	
	// Validation errors
	ErrEmptyName         = errors.New("Name cannot be empty")
	ErrEmptyEmail        = errors.New("Email cannot be empty")
	ErrEmptyPassword     = errors.New("Password cannot be empty")
)
