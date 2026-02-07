package domain

type LatLng struct {
	Lat float64 `json:"latitude"`
	Lng float64 `json:"longitude"`
}

type BuildingPolygon struct {
	Code    string   `json:"code"`
	Polygon []LatLng `json:"polygon"`
}

type CampusBuildingsResponse struct {
	Campus    string            `json:"campus"`
	Buildings []BuildingPolygon `json:"buildings"`
}
