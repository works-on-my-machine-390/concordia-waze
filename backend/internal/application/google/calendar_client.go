package google

import (
// "google.golang.org/api/calendar/v3"
)

type CalendarGetter interface {
	GetCalendarEvents(userID string) ([]string, error)
}
