package domain

type IndoorRoom struct {
	Room         string         `json:"room"`
	Building     string         `json:"building"`
	Floor        int            `json:"floor"`
	Centroid     IndoorPosition `json:"centroid"`
	GeometryType string         `json:"geometry_type"`
}
