package request_format

import "github.com/works-on-my-machine-390/concordia-waze/internal/domain"

type RouteLocation struct {
	Latitude       float64                `json:"latitude" binding:"required_without=Building"`
	Longitude      float64                `json:"longitude" binding:"required_without=Building"`
	Building       string                 `json:"building" binding:"required_with=FloorNumber,required_with=Room,required_with=IndoorPosition"`
	FloorNumber    *int                   `json:"floor_number"`
	IndoorPosition *domain.IndoorPosition `json:"indoor_position"`
	Room           string                 `json:"room"`
}

type RoutePreferences struct {
	Mode              []string `json:"mode" binding:"omitempty,dive,oneof=walking driving transit shuttle bicycling"`
	Day               string   `json:"day" binding:"omitempty,oneof=Monday Tuesday Wednesday Thursday Friday Saturday Sunday"`
	Time              string   `json:"time"`
	PreferElevator    bool     `json:"prefer_elevator"`
	RequireAccessible bool     `json:"require_accessible"`
}

type RouteRequest struct {
	Start       RouteLocation    `json:"start" binding:"required"`
	End         RouteLocation    `json:"end" binding:"required"`
	Preferences RoutePreferences `json:"preferences"`
}
