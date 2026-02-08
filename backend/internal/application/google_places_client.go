package application

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/url"
)

type PlacesClient interface {
	FindPlaceID(input string, lat, lng float64) (string, error)
	GetPhotoURLs(placeID string) ([]string, error)
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
	for _, p := range result.Result.Photos {
		urls = append(urls, fmt.Sprintf(
			"https://maps.googleapis.com/maps/api/place/photo?maxwidth=1600&photo_reference=%s&key=%s",
			p.PhotoRef,
			c.apiKey,
		))
	}

	return urls, nil
}
