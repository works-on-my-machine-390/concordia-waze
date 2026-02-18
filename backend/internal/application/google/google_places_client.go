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

type PlacesClient interface {
	FindPlaceID(input string, lat, lng float64) (string, error)
	GetPhotoURLs(placeID string) ([]string, error)
	GetOpeningHours(placeID string) (domain.OpeningHours, error)
}

type googlePlacesClient struct {
	apiKey string
}

func NewGooglePlacesClient(apiKey string) PlacesClient {
	return &googlePlacesClient{apiKey: apiKey}
}

func (c *googlePlacesClient) FindPlaceID(
	input string,
	lat, lng float64,
) (string, error) {
	endpoint := "https://maps.googleapis.com/maps/api/place/findplacefromtext/json"

	params := url.Values{}
	params.Set("input", input)
	params.Set("inputtype", "textquery")
	params.Set("fields", "place_id")
	params.Set(
		"locationbias",
		fmt.Sprintf("point:%f,%f", lat, lng),
	)
	params.Set("key", c.apiKey)

	resp, err := http.Get(endpoint + "?" + params.Encode())
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	var result struct {
		Candidates []struct {
			PlaceID string `json:"place_id"`
		} `json:"candidates"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", err
	}

	if len(result.Candidates) == 0 {
		return "", errors.New("no place found")
	}

	return result.Candidates[0].PlaceID, nil
}

func (c *googlePlacesClient) GetPhotoURLs(placeID string) ([]string, error) {
	endpoint := "https://maps.googleapis.com/maps/api/place/details/json"

	params := url.Values{}
	params.Set("place_id", placeID)
	params.Set("fields", "photos")
	params.Set("key", c.apiKey)

	resp, err := http.Get(endpoint + "?" + params.Encode())
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var result struct {
		Result struct {
			Photos []struct {
				PhotoRef string `json:"photo_reference"`
			} `json:"photos"`
		} `json:"result"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}

	var urls []string
	photos := result.Result.Photos

	if len(photos) > 2 {
		photos = photos[:2]
	}

	for _, p := range photos {
		urls = append(urls, fmt.Sprintf(
			"https://maps.googleapis.com/maps/api/place/photo?maxwidth=1600&photo_reference=%s&key=%s",
			p.PhotoRef,
			c.apiKey,
		))
	}

	return urls, nil
}

func (c *googlePlacesClient) GetOpeningHours(placeID string) (domain.OpeningHours, error) {
	endpoint := "https://maps.googleapis.com/maps/api/place/details/json"

	params := url.Values{}
	params.Set("place_id", placeID)
	params.Set("fields", "opening_hours")
	params.Set("key", c.apiKey)

	resp, err := http.Get(endpoint + "?" + params.Encode())
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var result struct {
		Result struct {
			OpeningHours struct {
				Periods []struct {
					Open struct {
						Day  int    `json:"day"`
						Time string `json:"time"` // "HHMM"
					} `json:"open"`
					Close struct {
						Day  int    `json:"day"`
						Time string `json:"time"` // "HHMM"
					} `json:"close"`
				} `json:"periods"`
			} `json:"opening_hours"`
		} `json:"result"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}

	periods := result.Result.OpeningHours.Periods
	if len(periods) == 0 {
		return domain.OpeningHours{}, nil
	}

	hours := make(domain.OpeningHours)
	for _, p := range periods {
		dayName := dayIndexToName(p.Open.Day)
		if dayName == "" {
			// skip unknown day indices
			continue
		}

		openStr := hhmmToHHColonMM(p.Open.Time)
		closeStr := hhmmToHHColonMM(p.Close.Time)

		// if there's already an entry for this day, prefer the earliest open and latest close
		if existing, ok := hours[dayName]; ok {
			// choose earliest open
			if existing.Open == "" || (openStr != "" && strings.Compare(openStr, existing.Open) < 0) {
				existing.Open = openStr
			}
			// choose latest close
			if existing.Close == "" || (closeStr != "" && strings.Compare(closeStr, existing.Close) > 0) {
				existing.Close = closeStr
			}
			hours[dayName] = existing
		} else {
			hours[dayName] = domain.DayHours{
				Open:  openStr,
				Close: closeStr,
			}
		}
	}

	return hours, nil
}

func dayIndexToName(idx int) string {
	// Google: 0 = Sunday, 1 = Monday, ..., 6 = Saturday
	switch idx {
	case 0:
		return "sunday"
	case 1:
		return "monday"
	case 2:
		return "tuesday"
	case 3:
		return "wednesday"
	case 4:
		return "thursday"
	case 5:
		return "friday"
	case 6:
		return "saturday"
	default:
		return ""
	}
}

func hhmmToHHColonMM(s string) string {
	// Expect "HHMM" or "HMM". Return "HH:MM" or empty string if invalid.
	s = strings.TrimSpace(s)
	if s == "" {
		return ""
	}
	// Pad to 4 digits if needed (e.g., "930" => "0930")
	if len(s) == 3 {
		s = "0" + s
	}
	if len(s) != 4 {
		return ""
	}
	return s[:2] + ":" + s[2:]
}
