package domain

type Coordinates struct {
	Latitude  float64 `json:"latitude"`
	Longitude float64 `json:"longitude"`
}

type Edge struct {
	StartVertex int `json:"startVertex"`
	EndVertex   int `json:"endVertex"`
}

type PointOfInterest struct {
	Name     string        `json:"name"`
	Type     string        `json:"type"`
	Position Coordinates   `json:"position"`
	Polygon  []Coordinates `json:"polygon"`
}
type Floor struct {
	BuildingCode string            `json:"buildingCode"`
	FloorNumber  string            `json:"floorNumber"`
	ImgPath      string            `json:"imgPath"`
	Vertices     []Coordinates     `json:"vertices"`
	Edges        []Edge            `json:"edges"`
	POIs         []PointOfInterest `json:"pois"`
}
