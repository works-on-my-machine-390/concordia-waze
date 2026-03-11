package domain

// ClassItem stores one schedule entry under a class.
type ClassItem struct {
	ItemID       string `firestore:"itemId" json:"itemId,omitempty"`
	Type         string `firestore:"type" json:"type"` // lab, lec, tut
	Section      string `firestore:"section" json:"section"`
	Day          string `firestore:"day" json:"day"`
	StartTime    string `firestore:"startTime" json:"startTime"`
	EndTime      string `firestore:"endTime" json:"endTime"`
	BuildingCode string `firestore:"buildingCode,omitempty" json:"buildingCode,omitempty"`
	Room         string `firestore:"room,omitempty" json:"room,omitempty"`
	Origin       string `firestore:"origin,omitempty" json:"origin,omitempty"` // e.g. "manual" or "google"
}
