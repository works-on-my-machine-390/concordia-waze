package google

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"strings"

	"github.com/works-on-my-machine-390/concordia-waze/internal/domain"
)

type DirectionsClient interface {
	GetDirections(start, end domain.LatLng, mode string) (domain.DirectionsResponse, error)
}

type googleDirectionsClient struct {
	apiKey string
}

func NewGoogleDirectionsClient(apiKey string) DirectionsClient {
	return &googleDirectionsClient{apiKey: apiKey}
}

func (c *googleDirectionsClient) GetDirections(start, end domain.LatLng, mode string) (domain.DirectionsResponse, error) {
	endpoint := "https://maps.googleapis.com/maps/api/directions/json"

	params := url.Values{}
	params.Set("origin", fmt.Sprintf("%f,%f", start.Lat, start.Lng))
	params.Set("destination", fmt.Sprintf("%f,%f", end.Lat, end.Lng))
	params.Set("mode", mode)
	params.Set("language", "en")
	params.Set("units", "metric")
	if strings.EqualFold(mode, "transit") {
		params.Set("departure_time", "now")
	}
	params.Set("key", c.apiKey)

	resp, err := http.Get(endpoint + "?" + params.Encode())
	if err != nil {
		return domain.DirectionsResponse{}, err
	}
	defer resp.Body.Close()

	var raw struct {
		Status string `json:"status"`
		Routes []struct {
			OverviewPolyline struct {
				Points string `json:"points"`
			} `json:"overview_polyline"`
			Legs []struct {
				Distance struct {
					Text string `json:"text"`
				} `json:"distance"`
				Duration struct {
					Text string `json:"text"`
				} `json:"duration"`
				Steps []struct {
					HTMLInstructions string `json:"html_instructions"`
					TravelMode       string `json:"travel_mode"`
					Maneuver         string `json:"maneuver"`
					Distance         struct {
						Text string `json:"text"`
					} `json:"distance"`
					Duration struct {
						Text string `json:"text"`
					} `json:"duration"`
					StartLocation struct {
						Lat float64 `json:"lat"`
						Lng float64 `json:"lng"`
					} `json:"start_location"`
					EndLocation struct {
						Lat float64 `json:"lat"`
						Lng float64 `json:"lng"`
					} `json:"end_location"`
					TransitDetails struct {
						Headsign string `json:"headsign"`
						NumStops int    `json:"num_stops"`
						Line     struct {
							ShortName string `json:"short_name"`
							Name      string `json:"name"`
							Vehicle   struct {
								Type string `json:"type"`
							} `json:"vehicle"`
						} `json:"line"`
						DepartureStop struct {
							Name string `json:"name"`
						} `json:"departure_stop"`
						ArrivalStop struct {
							Name string `json:"name"`
						} `json:"arrival_stop"`
						DepartureTime struct {
							Text string `json:"text"`
						} `json:"departure_time"`
						ArrivalTime struct {
							Text string `json:"text"`
						} `json:"arrival_time"`
					} `json:"transit_details"`
				} `json:"steps"`
			} `json:"legs"`
		} `json:"routes"`
		ErrorMessage string `json:"error_message"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&raw); err != nil {
		return domain.DirectionsResponse{}, err
	}

	if raw.Status != "OK" {
		if raw.ErrorMessage != "" {
			return domain.DirectionsResponse{}, errors.New(raw.ErrorMessage)
		}
		return domain.DirectionsResponse{}, fmt.Errorf("directions api status: %s", raw.Status)
	}

	if len(raw.Routes) == 0 || len(raw.Routes[0].Legs) == 0 {
		return domain.DirectionsResponse{}, errors.New("no route found")
	}

	route := raw.Routes[0]
	leg := route.Legs[0]

	points, err := decodePolyline(route.OverviewPolyline.Points)
	if err != nil {
		return domain.DirectionsResponse{}, err
	}

	steps := make([]domain.DirectionStep, 0, len(leg.Steps))
	for _, s := range leg.Steps {
		transitLine := s.TransitDetails.Line.ShortName
		if transitLine == "" {
			transitLine = s.TransitDetails.Line.Name
		}

		steps = append(steps, domain.DirectionStep{
			Instruction:     s.HTMLInstructions,
			Distance:        s.Distance.Text,
			Duration:        s.Duration.Text,
			Start:           domain.LatLng{Lat: s.StartLocation.Lat, Lng: s.StartLocation.Lng},
			End:             domain.LatLng{Lat: s.EndLocation.Lat, Lng: s.EndLocation.Lng},
			TravelMode:      s.TravelMode,
			Maneuver:        s.Maneuver,
			TransitLine:     transitLine,
			TransitType:     s.TransitDetails.Line.Vehicle.Type,
			TransitHeadsign: s.TransitDetails.Headsign,
			DepartureStop:   s.TransitDetails.DepartureStop.Name,
			ArrivalStop:     s.TransitDetails.ArrivalStop.Name,
			DepartureTime:   s.TransitDetails.DepartureTime.Text,
			ArrivalTime:     s.TransitDetails.ArrivalTime.Text,
			NumStops:        s.TransitDetails.NumStops,
		})
	}

	return domain.DirectionsResponse{
		Mode:     mode,
		Distance: leg.Distance.Text,
		Duration: leg.Duration.Text,
		Polyline: points,
		Steps:    steps,
	}, nil
}

// Standard Google polyline decoder
func decodePolyline(encoded string) ([]domain.LatLng, error) {
	var (
		points []domain.LatLng
		lat    int
		lng    int
		i      int
	)

	for i < len(encoded) {
		var result int
		var shift uint

		for {
			if i >= len(encoded) {
				return nil, errors.New("invalid polyline encoding")
			}
			b := int(encoded[i]) - 63
			i++
			result |= (b & 0x1f) << shift
			shift += 5
			if b < 0x20 {
				break
			}
		}
		dlat := (result >> 1) ^ (-(result & 1))
		lat += dlat

		result = 0
		shift = 0
		for {
			if i >= len(encoded) {
				return nil, errors.New("invalid polyline encoding")
			}
			b := int(encoded[i]) - 63
			i++
			result |= (b & 0x1f) << shift
			shift += 5
			if b < 0x20 {
				break
			}
		}
		dlng := (result >> 1) ^ (-(result & 1))
		lng += dlng

		points = append(points, domain.LatLng{
			Lat: float64(lat) / 1e5,
			Lng: float64(lng) / 1e5,
		})
	}

	return points, nil
}
