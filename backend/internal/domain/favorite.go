package domain

// Favorite represents a saved favorite location for a user
type Favorite struct {
	ID        string  `json:"id"`
	UserID    string  `json:"userId"`
	Name      string  `json:"name"`
	Latitude  float64 `json:"latitude"`
	Longitude float64 `json:"longitude"`
}
