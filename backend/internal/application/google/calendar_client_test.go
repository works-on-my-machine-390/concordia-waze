package google

import (
	"strings"
	"testing"
	"time"

	"google.golang.org/api/calendar/v3"

	"github.com/works-on-my-machine-390/concordia-waze/internal/domain"
)

func TestParseEvent(t *testing.T) {
	c := &CalendarClient{
		buildingRepo: nil,
	}

	t.Run("valid event without building", func(t *testing.T) {
		start := "2026-03-16T09:00:00Z"
		end := "2026-03-16T10:00:00Z"

		ev := &calendar.Event{
			Id:      "evt-1",
			Summary: "COMP 202 LEC",
			Start:   &calendar.EventDateTime{DateTime: start},
			End:     &calendar.EventDateTime{DateTime: end},
			// location with no " - Building" part so buildingRepo is not needed
			Location: "Downtown Campus",
		}

		item, errStr := c.parseEvent(ev)
		if errStr != "" {
			t.Fatalf("expected no error string, got: %q", errStr)
		}
		if item == nil {
			t.Fatalf("expected a ClassItem, got nil")
		}

		if item.EventID != "evt-1" {
			t.Fatalf("unexpected EventID: want %q got %q", "evt-1", item.EventID)
		}
		if item.Origin != "google" {
			t.Fatalf("unexpected Origin: want %q got %q", "google", item.Origin)
		}
		if item.ClassID != "COMP 202" {
			t.Fatalf("unexpected ClassID: want %q got %q", "COMP 202", item.ClassID)
		}
		if item.Type != "lec" {
			t.Fatalf("unexpected Type: want %q got %q", "lec", item.Type)
		}

		// compute expected day and times
		startTime, _ := time.Parse(time.RFC3339, start)
		expectedDay := startTime.Weekday().String()
		if item.Day != expectedDay {
			t.Fatalf("unexpected Day: want %q got %q", expectedDay, item.Day)
		}
		if item.StartTime != "09:00" {
			t.Fatalf("unexpected StartTime: want %q got %q", "09:00", item.StartTime)
		}
		if item.EndTime != "10:00" {
			t.Fatalf("unexpected EndTime: want %q got %q", "10:00", item.EndTime)
		}
		// no building or room information expected
		if item.BuildingCode != "" {
			t.Fatalf("unexpected BuildingCode: want empty got %q", item.BuildingCode)
		}
		if item.Room != "" {
			t.Fatalf("unexpected Room: want empty got %q", item.Room)
		}
	})

	t.Run("invalid summary format", func(t *testing.T) {
		ev := &calendar.Event{
			Id:       "evt-2",
			Summary:  "BAD-NAME",
			Start:    &calendar.EventDateTime{DateTime: "2026-03-16T09:00:00Z"},
			End:      &calendar.EventDateTime{DateTime: "2026-03-16T10:00:00Z"},
			Location: "Downtown Campus",
		}

		item, errStr := c.parseEvent(ev)
		if item == (new(domain.ClassItem)) {
			// never expect zero-value pointer
			// just ensure item is non-nil/usable
		}
		if errStr == "" {
			t.Fatalf("expected an error string for invalid summary format, got empty")
		}
		if !strings.Contains(errStr, "event name does not match expected format") {
			t.Fatalf("unexpected error string content: %q", errStr)
		}
	})

	t.Run("bad start date parsing", func(t *testing.T) {
		ev := &calendar.Event{
			Id:       "evt-3",
			Summary:  "COMP 202 LEC",
			Start:    &calendar.EventDateTime{DateTime: "not-a-date"},
			End:      &calendar.EventDateTime{DateTime: "2026-03-16T10:00:00Z"},
			Location: "Downtown Campus",
		}

		_, errStr := c.parseEvent(ev)
		if errStr == "" {
			t.Fatalf("expected an error string for bad start date, got empty")
		}
		if !strings.Contains(errStr, "Error parsing date") {
			t.Fatalf("unexpected error string content: %q", errStr)
		}
	})

	t.Run("location missing or malformed", func(t *testing.T) {
		ev := &calendar.Event{
			Id:       "evt-4",
			Summary:  "COMP 202 LEC",
			Start:    &calendar.EventDateTime{DateTime: "2026-03-16T09:00:00Z"},
			End:      &calendar.EventDateTime{DateTime: "2026-03-16T10:00:00Z"},
			Location: "",
		}

		_, errStr := c.parseEvent(ev)
		if errStr == "" {
			t.Fatalf("expected an error string for missing location, got empty")
		}
		if !strings.Contains(errStr, "event location does not match expected format") {
			t.Fatalf("unexpected error string content: %q", errStr)
		}
	})

	t.Run("room present but no building", func(t *testing.T) {
		// "Campus Rm 123" should match: group1 -> Campus, group2 empty, group3 -> 123
		ev := &calendar.Event{
			Id:       "evt-5",
			Summary:  "COMP 202 LEC",
			Start:    &calendar.EventDateTime{DateTime: "2026-03-16T09:00:00Z"},
			End:      &calendar.EventDateTime{DateTime: "2026-03-16T10:00:00Z"},
			Location: "Loyola Rm 123",
		}

		item, errStr := c.parseEvent(ev)
		if errStr != "" {
			t.Fatalf("expected no error string, got: %q", errStr)
		}
		if item.Room != "123" {
			t.Fatalf("unexpected Room: want %q got %q", "123", item.Room)
		}
		// BuildingCode should remain empty because there's no " - Building" portion
		if item.BuildingCode != "" {
			t.Fatalf("unexpected BuildingCode: want empty got %q", item.BuildingCode)
		}
	})
}
