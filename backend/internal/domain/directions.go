package domain

type DirectionStep struct {
	Instruction     string `json:"instruction"`
	Distance        string `json:"distance"`
	Duration        string `json:"duration"`
	Polyline        string `json:"polyline,omitempty"`
	Start           LatLng `json:"start"`
	End             LatLng `json:"end"`
	TravelMode      string `json:"travel_mode,omitempty"`
	Maneuver        string `json:"maneuver,omitempty"`
	TransitLine     string `json:"transit_line,omitempty"`
	TransitType     string `json:"transit_type,omitempty"`
	TransitHeadsign string `json:"transit_headsign,omitempty"`
	DepartureStop   string `json:"departure_stop,omitempty"`
	ArrivalStop     string `json:"arrival_stop,omitempty"`
	DepartureTime   string `json:"departure_time,omitempty"`
	ArrivalTime     string `json:"arrival_time,omitempty"`
	NumStops        int    `json:"num_stops,omitempty"`
}

type DirectionsResponse struct {
	Mode             string          `json:"mode"`
	DepartureMessage string          `json:"departure_message,omitempty"`
	Distance         string          `json:"distance,omitempty"`
	Duration         string          `json:"duration,omitempty"`
	Polyline         string          `json:"polyline"`
	Steps            []DirectionStep `json:"steps"`
}
