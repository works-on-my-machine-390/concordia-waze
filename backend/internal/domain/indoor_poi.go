package domain

type IndoorPOI struct {
	ID       int            `json:"id"`
	Building string         `json:"building"`
	Floor    int            `json:"floor"`
	Type     string         `json:"type"`
	Position IndoorPosition `json:"position"`
}
