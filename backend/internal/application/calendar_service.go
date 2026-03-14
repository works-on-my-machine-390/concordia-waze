package application

import (
	"time"

	"github.com/works-on-my-machine-390/concordia-waze/internal/application/google"
	"golang.org/x/oauth2"
)

type CalendarService interface {
	SyncCalendarEvents(day time.Time, token *oauth2.Token) error
}

type calendarService struct {
	calGetter google.CalendarGetter
}

func NewCalendarService(calGetter google.CalendarGetter) CalendarService {
	return &calendarService{
		calGetter: calGetter,
	}
}

func (s *calendarService) SyncCalendarEvents(day time.Time, token *oauth2.Token) error {
	// get events from google calendar client

	_, err := s.calGetter.GetCalendarEvents(token)

	if err != nil {
		return err
	}

	// check if events are the same as the ones we have stored for the user (e.g. by comparing event IDs)

	// store in firebase

	// return errors
	return nil
}
