package domain

type LatLng struct {
	Lat float64 `json:"lat"`
	Lng float64 `json:"lng"`
}

type BuildingPolygon struct {
	Code    string   `json:"code"`
	Polygon []LatLng `json:"polygon"`
}

type CampusBuildingsResponse struct {
	Campus    string            `json:"campus"`
	Buildings []BuildingPolygon `json:"buildings"`
}
