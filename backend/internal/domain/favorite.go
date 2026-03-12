package domain

// FavoriteType identifies whether a favorite refers to an outdoor or indoor location.
type FavoriteType string

const (
	FavoriteTypeOutdoor FavoriteType = "outdoor"
	FavoriteTypeIndoor  FavoriteType = "indoor"
)

// Favorite represents a saved favorite location for a user.
// Outdoor favorites use Latitude/Longitude; indoor favorites use BuildingCode/FloorNumber/X/Y.
type Favorite struct {
	ID     string       `json:"id"`
	UserID string       `json:"userId"`
	Type   FavoriteType `json:"type"`
	Name   string       `json:"name"`

	// Outdoor fields
	Latitude  float64 `json:"latitude,omitempty"`
	Longitude float64 `json:"longitude,omitempty"`

	// Indoor fields
	BuildingCode string  `json:"buildingCode,omitempty"`
	FloorNumber  int     `json:"floorNumber,omitempty"`
	X            float64 `json:"x,omitempty"`
	Y            float64 `json:"y,omitempty"`
	PoiType      string  `json:"poiType,omitempty"`
}
