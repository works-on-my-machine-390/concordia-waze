package google

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"

	"github.com/works-on-my-machine-390/concordia-waze/internal/domain"
	"github.com/works-on-my-machine-390/concordia-waze/internal/constants"
)

type PlacesClient interface {
	FindPlaceID(input string, lat, lng float64) (string, error)
	GetPhotoURLs(placeID string) ([]string, error)
	GetOpeningHours(placeID string) (domain.OpeningHours, error)
	TextSearchPlaces(input string, lat, lng float64, maxDistanceInMeters int, rankPreference string) ([]domain.Building, error)
}

type googlePlacesClient struct {
	apiKey string
}

type TextSearchPayload struct {
	PageSize       int    `json:"pageSize"`
	RankPreference string `json:"rankPreference"`
	Location       struct {
		Circle struct {
			Center struct {
				Latitude  float64 `json:"latitude"`
				Longitude float64 `json:"longitude"`
			} `json:"center"`
			Radius int `json:"radius"`
		} `json:"circle"`
	} `json:"locationBias"`
	Query string `json:"textQuery"`
}
type RawTextSearchResponse struct {
	Places []struct {
		Name             string `json:"name"`
		FormattedAddress string `json:"formattedAddress"`
		Location         struct {
			Latitude  float64 `json:"latitude"`
			Longitude float64 `json:"longitude"`
		} `json:"location"`
		DisplayName struct {
			Text string `json:"text"`
		} `json:"displayName"`
		Types []string `json:"types"`
	} `json:"places"`
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

	const max = constants.MaxReturnedImageCount

	if len(photos) > max {
		photos = photos[:max]
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

func (c *googlePlacesClient) TextSearchPlaces(
	input string,
	lat, lng float64,
	maxDistanceInMeters int,
	rankPreference string,
) ([]domain.Building, error) {
	PAGESIZE := 10
	endpoint := "https://places.googleapis.com/v1/places:searchText"

	data := TextSearchPayload{
		PageSize:       PAGESIZE,
		RankPreference: rankPreference,
		Query:          input}

	data.Location.Circle.Center.Latitude = lat
	data.Location.Circle.Center.Longitude = lng
	data.Location.Circle.Radius = maxDistanceInMeters

	jsonData, err := json.Marshal(data)
	if err != nil {
		return nil, err
	}

	req, err := http.NewRequest("POST", endpoint, bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, err
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Goog-Api-Key", c.apiKey)
	req.Header.Set("X-Goog-FieldMask",
		"places.name,"+
			"places.displayName,"+
			"places.formattedAddress,"+
			"places.types,"+
			"places.location")

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("unexpected status code: %d. %s", resp.StatusCode, body)
	}

	var placesResp RawTextSearchResponse

	if err := json.NewDecoder(resp.Body).Decode(&placesResp); err != nil {
		return nil, err
	}

	var places []domain.Building

	for _, p := range placesResp.Places {
		places = append(places, domain.Building{
			Code:      p.Name,
			Name:      p.DisplayName.Text,
			Address:   p.FormattedAddress,
			Services:  p.Types,
			Latitude:  p.Location.Latitude,
			Longitude: p.Location.Longitude,
		})
	}

	return places, nil
}
