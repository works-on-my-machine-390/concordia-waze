package application

import (
	"fmt"
	"time"

	"github.com/works-on-my-machine-390/concordia-waze/internal/application/google"
	"github.com/works-on-my-machine-390/concordia-waze/internal/domain"
	"golang.org/x/net/context"
	"golang.org/x/oauth2"
)

type CalendarService interface {
	SyncCalendarEvents(token *oauth2.Token, userID string, day time.Time, calendarID string) (map[string][]*domain.ClassItem, []string, error)
}

type calendarService struct {
	calGetter google.CalendarGetter
	firebase  FirebaseClassService
}

func NewCalendarService(calGetter google.CalendarGetter, firebase FirebaseClassService) CalendarService {
	return &calendarService{
		calGetter: calGetter,
		firebase:  firebase,
	}
}

func (s *calendarService) SyncCalendarEvents(token *oauth2.Token, userID string, day time.Time, calendarID string) (map[string][]*domain.ClassItem, []string, error) {

	// get events from google calendar client
	fmt.Println("syncCalendarEvents", "userID:", userID, "day:", day.Format("2006-01-02"), "calendarID:", calendarID)
	events, errors, err := s.calGetter.GetCalendarEvents(token, day, calendarID)
	if err != nil {
		return nil, nil, err
	}
	// check if events are the same as the ones we have stored for the user (e.g. by comparing event IDs)
	// store if not, otherwise skip
	existingClasses, err := s.firebase.GetAllClassItems(userID)
	if err != nil {
		return nil, nil, err
	}

	for class, classItems := range events {
		for _, classItem := range classItems {
			found := false
			for _, existingClass := range existingClasses[class] {
				if existingClass.EventID == classItem.EventID {
					found = true
					break
				}
			}
			if !found {
				ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
				defer cancel()
				if _, err := s.firebase.AddClassItem(ctx, userID, class, *classItem); err != nil {
					return nil, nil, err
				}
			}
		}
	}

	return events, errors, nil
}
