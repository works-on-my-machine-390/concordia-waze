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
	ErrUserAlreadyExists = errors.New("User with this email already exists")

	// Other errors
	ErrNotFound = errors.New("not found")

	//directions errors
	ErrInvalidMode = errors.New("Invalide mode, must be one of: walking, driving, transit, shuttle, bicycling")

	// Favorite errors
	ErrFavoriteNotFound     = errors.New("favorite not found")
  ErrFavoriteAlreadyExists = errors.New("favorite already exists")
	ErrEmptyFavoriteName    = errors.New("name cannot be empty")
	ErrInvalidFavoriteType  = errors.New("type must be 'outdoor' or 'indoor'")
	ErrOutdoorMissingCoords = errors.New("outdoor favorites require latitude and longitude")
	ErrIndoorMissingFields  = errors.New("indoor favorites require buildingCode, floorNumber, x, and y")
	ErrCourseNotFound       = errors.New("course not found")

	// Room Search errors
	ErrRoomNotFound     = errors.New("room not found")
	ErrFloorNotMapped   = errors.New("floor not mapped")
	ErrBuildingNotFound = errors.New("building not found")
)
