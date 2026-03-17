package application

import (
	"context"
	"time"

	"github.com/works-on-my-machine-390/concordia-waze/internal/application/google"
	"github.com/works-on-my-machine-390/concordia-waze/internal/domain"
	"golang.org/x/oauth2"
)

type CalendarSyncer interface {
	SyncCalendarEvents(token *oauth2.Token, userID string, day time.Time, calendarID string) (map[string][]*domain.ClassItem, []string, error)
}

type calendarService struct {
	calGetter google.CalendarGetter
	firebase  FirebaseClassService
}

func NewCalendarService(calGetter google.CalendarGetter, firebase FirebaseClassService) CalendarSyncer {
	return &calendarService{
		calGetter: calGetter,
		firebase:  firebase,
	}
}

func (s *calendarService) SyncCalendarEvents(token *oauth2.Token, userID string, day time.Time, calendarID string) (map[string][]*domain.ClassItem, []string, error) {
	// get events from google calendar client
	events, errors, err := s.calGetter.GetCalendarEvents(token, day, calendarID)
	if err != nil {
		return nil, nil, err
	}

	// get existing classes for user
	existingClasses, err := s.firebase.GetAllClassItems(userID)
	if err != nil {
		return nil, nil, err
	}

	// build a lookup set of existing event IDs per class to avoid nested loops
	existingIDs := make(map[string]map[string]struct{}, len(existingClasses))
	for class, items := range existingClasses {
		if existingIDs[class] == nil {
			existingIDs[class] = make(map[string]struct{}, len(items))
		}
		for _, it := range items {
			existingIDs[class][it.EventID] = struct{}{}
		}
	}

	// iterate events and add missing ones
	for class, classItems := range events {
		if existingIDs[class] == nil {
			existingIDs[class] = make(map[string]struct{}, len(classItems))
		}
		for _, classItem := range classItems {
			_, exists := existingIDs[class][classItem.EventID]
			if exists {
				continue
			}

			// create a short-lived context for the add operation, call cancel immediately after use
			ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
			_, err = s.firebase.AddClassItem(ctx, userID, class, *classItem)
			if err != nil {
				cancel()
				return nil, nil, err
			}
			cancel()

			// mark as added so subsequent iterations don't re-add
			existingIDs[class][classItem.EventID] = struct{}{}
		}
	}

	return events, errors, nil
}
