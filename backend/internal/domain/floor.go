package domain

type Coordinates struct {
	X float64 `json:"x"`
	Y float64 `json:"y"`
}

type Edge struct {
	StartVertex int  `json:"startVertex"`
	EndVertex   int  `json:"endVertex"`
	Accessible  bool `json:"accessible"` // true if wheelchair accessible (default: true when omitted)
}

type PointOfInterest struct {
	Name     string        `json:"name"`
	Type     string        `json:"type"`
	Position Coordinates   `json:"position"`
	Polygon  []Coordinates `json:"polygon"`
}
type Floor struct {
	FloorName   string            `json:"name"`
	FloorNumber int               `json:"number"`
	ImgPath     string            `json:"imgPath"`
	Vertices    []Coordinates     `json:"vertices"`
	Edges       []Edge            `json:"edges"`
	POIs        []PointOfInterest `json:"pois"`
}
