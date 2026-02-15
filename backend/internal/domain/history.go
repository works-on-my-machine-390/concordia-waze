package domain

import "time"

type DestinationType string

const (
	DestinationBuilding DestinationType = "building"
	DestinationPOI      DestinationType = "poi"
)

type HistoryItem struct {
	ID              string          `json:"id,omitempty"`
	UserID          string          `json:"userId,omitempty"` 
	DestinationType DestinationType `json:"destinationType"`
	DestinationID   string          `json:"destinationId"`
	Name            string          `json:"name"`
	Address         string 		    `json:"address"`
	CreatedAt       time.Time       `json:"createdAt,omitempty"`
}
