package google

import (
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/works-on-my-machine-390/concordia-waze/internal/domain"
)

// We intercept http.Get by rewriting the default transport using httptest server URL.
// Easiest: temporarily replace the endpoint via a test-only helper by spinning a server
// and calling it through a client that uses a custom RoundTripper.
//
// Since your implementation uses http.Get directly, we test decodePolyline thoroughly
// + we validate JSON parsing / status handling by temporarily patching http.DefaultTransport.

type rewriteTransport struct {
	base   http.RoundTripper
	target string
}

func (t *rewriteTransport) RoundTrip(req *http.Request) (*http.Response, error) {
	// rewrite to our test server but keep the query string
	u := *req.URL
	u.Scheme = "http"
	u.Host = t.target
	req.URL = &u
	return t.base.RoundTrip(req)
}

func TestGoogleDirectionsClient_GetDirections_SuccessOK(t *testing.T) {
	// Minimal OK response with one route, one leg, one step, plus an encoded polyline.
	body := `{
		"status": "OK",
		"routes": [{
			"overview_polyline": { "points": "??" },
			"legs": [{
				"steps": [{
					"html_instructions": "Head <b>north</b>",
					"distance": {"text": "0.2 km"},
					"duration": {"text": "2 mins"},
					"start_location": {"lat": 45.0, "lng": -73.0},
					"end_location": {"lat": 45.1, "lng": -73.1}
				}]
			}]
		}]
	}`

	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		assert.Contains(t, r.URL.RawQuery, "origin=")
		assert.Contains(t, r.URL.RawQuery, "destination=")
		assert.Contains(t, r.URL.RawQuery, "mode=walking")
		assert.Contains(t, r.URL.RawQuery, "language=en")
		assert.Contains(t, r.URL.RawQuery, "units=metric")
		assert.Contains(t, r.URL.RawQuery, "key=test-key")
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(body))
	}))
	defer srv.Close()

	// Patch default transport to rewrite Google endpoint to our server
	oldTransport := http.DefaultTransport
	http.DefaultTransport = &rewriteTransport{
		base:   oldTransport,
		target: srv.Listener.Addr().String(),
	}
	defer func() { http.DefaultTransport = oldTransport }()

	c := NewGoogleDirectionsClient("test-key")
	resp, err := c.GetDirections(domain.LatLng{Lat: 1, Lng: 2}, domain.LatLng{Lat: 3, Lng: 4}, "walking")
	assert.NoError(t, err)
	assert.Equal(t, "walking", resp.Mode)
	assert.NotEmpty(t, resp.Steps)
	assert.Equal(t, "Head <b>north</b>", resp.Steps[0].Instruction)
	assert.Equal(t, "0.2 km", resp.Steps[0].Distance)
	assert.Equal(t, "2 mins", resp.Steps[0].Duration)
	assert.Equal(t, "??", resp.Polyline)
}

func TestGoogleDirectionsClient_StatusNotOK_WithErrorMessage(t *testing.T) {
	body := `{"status":"REQUEST_DENIED","error_message":"nope"}`
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(body))
	}))
	defer srv.Close()

	oldTransport := http.DefaultTransport
	http.DefaultTransport = &rewriteTransport{base: oldTransport, target: srv.Listener.Addr().String()}
	defer func() { http.DefaultTransport = oldTransport }()

	c := NewGoogleDirectionsClient("k")
	_, err := c.GetDirections(domain.LatLng{}, domain.LatLng{}, "walking")
	assert.Error(t, err)
	assert.Equal(t, "nope", err.Error())
}

func TestGoogleDirectionsClient_TransitIncludesDepartureTimeNow(t *testing.T) {
	body := `{
		"status": "OK",
		"routes": [{
			"overview_polyline": { "points": "??" },
			"legs": [{
				"distance": {"text": "1.0 km"},
				"duration": {"text": "10 mins"},
				"steps": []
			}]
		}]
	}`

	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		assert.Contains(t, r.URL.RawQuery, "mode=transit")
		assert.Contains(t, r.URL.RawQuery, "departure_time=now")
		assert.Contains(t, r.URL.RawQuery, "language=en")
		assert.Contains(t, r.URL.RawQuery, "units=metric")
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(body))
	}))
	defer srv.Close()

	oldTransport := http.DefaultTransport
	http.DefaultTransport = &rewriteTransport{base: oldTransport, target: srv.Listener.Addr().String()}
	defer func() { http.DefaultTransport = oldTransport }()

	c := NewGoogleDirectionsClient("k")
	resp, err := c.GetDirections(domain.LatLng{}, domain.LatLng{}, "transit")
	assert.NoError(t, err)
	assert.Equal(t, "1.0 km", resp.Distance)
	assert.Equal(t, "10 mins", resp.Duration)
}

func TestGoogleDirectionsClient_StatusNotOK_NoErrorMessage(t *testing.T) {
	body := `{"status":"ZERO_RESULTS"}`
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(body))
	}))
	defer srv.Close()

	oldTransport := http.DefaultTransport
	http.DefaultTransport = &rewriteTransport{base: oldTransport, target: srv.Listener.Addr().String()}
	defer func() { http.DefaultTransport = oldTransport }()

	c := NewGoogleDirectionsClient("k")
	_, err := c.GetDirections(domain.LatLng{}, domain.LatLng{}, "walking")
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "directions api status")
}

func TestGoogleDirectionsClient_NoRoutesOrLegs(t *testing.T) {
	cases := []string{
		`{"status":"OK","routes":[]}`,
		`{"status":"OK","routes":[{"legs":[]}]}`,
	}

	for i, body := range cases {
		t.Run(fmt.Sprintf("case_%d", i), func(t *testing.T) {
			srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				w.Header().Set("Content-Type", "application/json")
				_, _ = w.Write([]byte(body))
			}))
			defer srv.Close()

			oldTransport := http.DefaultTransport
			http.DefaultTransport = &rewriteTransport{base: oldTransport, target: srv.Listener.Addr().String()}
			defer func() { http.DefaultTransport = oldTransport }()

			c := NewGoogleDirectionsClient("k")
			_, err := c.GetDirections(domain.LatLng{}, domain.LatLng{}, "walking")
			assert.Error(t, err)
			assert.Contains(t, err.Error(), "no route found")
		})
	}
}
