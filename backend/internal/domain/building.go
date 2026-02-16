package domain

type Building struct {
	Code            string  `json:"code"`
	Name            string  `json:"name"`
	LongName        string  `json:"long_name"`
	Address         string  `json:"address"`
	Latitude        float64 `json:"latitude"`
	Longitude       float64 `json:"longitude"`
	MetroAccessible bool    `json:"metro_accessible"`

	Services      []string `json:"services"`
	Departments   []string `json:"departments"`
	Venues        []string `json:"venues"`
	Accessibility []string `json:"accessibility"`
}
