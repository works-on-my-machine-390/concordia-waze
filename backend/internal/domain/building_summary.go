package domain

type BuildingSummary struct {
	Code     string `json:"code"`
	Name     string `json:"name"`
	LongName string `json:"long_name,omitempty"`
	Address  string `json:"address"`
	Campus   string `json:"campus,omitempty"` // "SGW" or "LOY"
}
