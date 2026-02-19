package domain

type BuildingPolygon struct {
	Code    string   `json:"code"`
	Polygon []LatLng `json:"polygon"`
}

type CampusBuildingsResponse struct {
	Campus    string            `json:"campus"`
	Buildings []BuildingPolygon `json:"buildings"`
}
