package domain

// IndoorPosition uses the same coordinate system as your POIs.geojson (EPSG:32198 in meters).
type IndoorPosition struct {
	X float64 `json:"x"`
	Y float64 `json:"y"`
}
