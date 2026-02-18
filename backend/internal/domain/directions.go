package domain

type DirectionStep struct {
	Instruction string `json:"instruction"`
	Distance    string `json:"distance"`
	Duration    string `json:"duration"`
	Start       LatLng `json:"start"`
	End         LatLng `json:"end"`
}

type DirectionsResponse struct {
	Mode     string          `json:"mode"`
	Polyline []LatLng        `json:"polyline"`
	Steps    []DirectionStep `json:"steps"`
}
