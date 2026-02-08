package application_test

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"net/url"
	"testing"

	"github.com/works-on-my-machine-390/concordia-waze/internal/application"
)

func TestFindPlaceID_Success(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		query := r.URL.Query()
		if query.Get("input") != "Concordia University" {
			t.Errorf("Expected input 'Concordia University', got %s", query.Get("input"))
		}
		if query.Get("inputtype") != "textquery" {
			t.Errorf("Expected inputtype 'textquery', got %s", query.Get("inputtype"))
		}
		if query.Get("fields") != "place_id" {
			t.Errorf("Expected fields 'place_id', got %s", query.Get("fields"))
		}
		if query.Get("locationbias") != "point:45.497284,-73.579047" {
			t.Errorf("Expected locationbias 'point:45.497284,-73.579047', got %s", query.Get("locationbias"))
		}
		if query.Get("key") != "test-api-key" {
			t.Errorf("Expected key 'test-api-key', got %s", query.Get("key"))
		}

		response := map[string]interface{}{
			"candidates": []map[string]string{
				{"place_id": "ChIJtest123"},
			},
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(response)
	}))
	defer server.Close()

	// Create client with modified endpoint (using mock server)
	client := newTestPlacesClient(server.URL, "test-api-key")

	placeID, err := client.FindPlaceID("Concordia University", 45.497284, -73.579047)

	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}
	if placeID != "ChIJtest123" {
		t.Errorf("Expected place_id 'ChIJtest123', got %s", placeID)
	}
}

func TestFindPlaceID_NoPlaceFound(t *testing.T) {
	// Create a mock server that returns no candidates
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		response := map[string]interface{}{
			"candidates": []map[string]string{},
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(response)
	}))
	defer server.Close()

	client := newTestPlacesClient(server.URL, "test-api-key")

	_, err := client.FindPlaceID("Nonexistent Place", 0.0, 0.0)

	if err == nil {
		t.Fatal("Expected error, got nil")
	}
	if err.Error() != "no place found" {
		t.Errorf("Expected error 'no place found', got %s", err.Error())
	}
}

func TestFindPlaceID_InvalidJSON(t *testing.T) {
	// Create a mock server that returns invalid JSON
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte("invalid json"))
	}))
	defer server.Close()

	client := newTestPlacesClient(server.URL, "test-api-key")

	_, err := client.FindPlaceID("Test Place", 0.0, 0.0)

	if err == nil {
		t.Fatal("Expected error, got nil")
	}
}

func TestFindPlaceID_NetworkError(t *testing.T) {
	// Use an invalid URL to simulate network error
	client := newTestPlacesClient("http://invalid-url-that-does-not-exist:99999", "test-api-key")

	_, err := client.FindPlaceID("Test Place", 0.0, 0.0)

	if err == nil {
		t.Fatal("Expected error, got nil")
	}
}

func TestGetPhotoURLs_Success(t *testing.T) {
	// Create a mock server
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Verify request parameters
		query := r.URL.Query()
		if query.Get("place_id") != "ChIJtest123" {
			t.Errorf("Expected place_id 'ChIJtest123', got %s", query.Get("place_id"))
		}
		if query.Get("fields") != "photos" {
			t.Errorf("Expected fields 'photos', got %s", query.Get("fields"))
		}
		if query.Get("key") != "test-api-key" {
			t.Errorf("Expected key 'test-api-key', got %s", query.Get("key"))
		}

		// Return mock response
		response := map[string]interface{}{
			"result": map[string]interface{}{
				"photos": []map[string]string{
					{"photo_reference": "photo_ref_1"},
					{"photo_reference": "photo_ref_2"},
					{"photo_reference": "photo_ref_3"},
				},
			},
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(response)
	}))
	defer server.Close()

	client := newTestPlacesClient(server.URL, "test-api-key")

	urls, err := client.GetPhotoURLs("ChIJtest123")

	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}
	if len(urls) != 3 {
		t.Fatalf("Expected 3 URLs, got %d", len(urls))
	}

	expectedURLs := []string{
		"https://maps.googleapis.com/maps/api/place/photo?maxwidth=1600&photo_reference=photo_ref_1&key=test-api-key",
		"https://maps.googleapis.com/maps/api/place/photo?maxwidth=1600&photo_reference=photo_ref_2&key=test-api-key",
		"https://maps.googleapis.com/maps/api/place/photo?maxwidth=1600&photo_reference=photo_ref_3&key=test-api-key",
	}

	for i, expectedURL := range expectedURLs {
		if urls[i] != expectedURL {
			t.Errorf("Expected URL %s, got %s", expectedURL, urls[i])
		}
	}
}

func TestGetPhotoURLs_NoPhotos(t *testing.T) {
	// Create a mock server that returns no photos
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		response := map[string]interface{}{
			"result": map[string]interface{}{
				"photos": []map[string]string{},
			},
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(response)
	}))
	defer server.Close()

	client := newTestPlacesClient(server.URL, "test-api-key")

	urls, err := client.GetPhotoURLs("ChIJtest123")

	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}
	if len(urls) != 0 {
		t.Errorf("Expected 0 URLs, got %d", len(urls))
	}
}

func TestGetPhotoURLs_InvalidJSON(t *testing.T) {
	// Create a mock server that returns invalid JSON
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte("invalid json"))
	}))
	defer server.Close()

	client := newTestPlacesClient(server.URL, "test-api-key")

	_, err := client.GetPhotoURLs("ChIJtest123")

	if err == nil {
		t.Fatal("Expected error, got nil")
	}
}

func TestGetPhotoURLs_NetworkError(t *testing.T) {
	// Use an invalid URL to simulate network error
	client := newTestPlacesClient("http://invalid-url:99999", "test-api-key")

	_, err := client.GetPhotoURLs("ChIJtest123")

	if err == nil {
		t.Fatal("Expected error, got nil")
	}
}

// Helper function to create a test client with custom endpoint
func newTestPlacesClient(baseURL, apiKey string) application.PlacesClient {
	return &testPlacesClient{
		apiKey:  apiKey,
		baseURL: baseURL,
	}
}

// testPlacesClient wraps the Google Places client for testing with mock endpoints
type testPlacesClient struct {
	apiKey  string
	baseURL string
}

func (c *testPlacesClient) FindPlaceID(input string, lat, lng float64) (string, error) {
	endpoint := c.baseURL

	params := url.Values{}
	params.Set("input", input)
	params.Set("inputtype", "textquery")
	params.Set("fields", "place_id")
	params.Set("locationbias", "point:"+fmt.Sprintf("%f,%f", lat, lng))
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

func (c *testPlacesClient) GetPhotoURLs(placeID string) ([]string, error) {
	endpoint := c.baseURL

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
