package domain

type DayHours struct {
	Open  string `json:"open,omitempty"`
	Close string `json:"close,omitempty"`
}

type OpeningHours map[string]DayHours

type Building struct {
	Code          string       `json:"code"`
	Name          string       `json:"name"`
	LongName      string       `json:"long_name"`
	Address       string       `json:"address"`
	Latitude      float64      `json:"latitude"`
	Longitude     float64      `json:"longitude"`
	Services      []string     `json:"services"`
	Departments   []string     `json:"departments"`
	Venues        []string     `json:"venues"`
	Accessibility []string     `json:"accessibility"`
	OpeningHours  OpeningHours `json:"opening_hours,omitempty"`
}
