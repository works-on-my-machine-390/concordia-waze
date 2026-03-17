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

type idSet map[string]struct{}
type existingIDsMap map[string]idSet
type eventsMap map[string][]*domain.ClassItem

func (s *calendarService) SyncCalendarEvents(token *oauth2.Token, userID string, day time.Time, calendarID string) (map[string][]*domain.ClassItem, []string, error) {
	events, errs, err := s.calGetter.GetCalendarEvents(token, day, calendarID)
	if err != nil {
		return nil, nil, err
	}

	existingClasses, err := s.firebase.GetAllClassItems(userID)
	if err != nil {
		return nil, nil, err
	}

	existingIDs := buildExistingIDs(existingClasses)

	err = s.addMissingEvents(userID, events, existingIDs)
	if err != nil {
		return nil, nil, err
	}

	return events, errs, nil
}

func buildExistingIDs(existingClasses map[string][]*domain.ClassItem) existingIDsMap {
	out := make(existingIDsMap, len(existingClasses))
	for class, items := range existingClasses {
		set := make(idSet, len(items))
		for _, it := range items {
			set[it.EventID] = struct{}{}
		}
		out[class] = set
	}
	return out
}

func (s *calendarService) addMissingEvents(userID string, events eventsMap, existing existingIDsMap) error {
	for class, classItems := range events {
		ids := ensureIDSet(existing, class, len(classItems))
		for _, classItem := range classItems {
			if _, ok := ids[classItem.EventID]; ok {
				continue
			}
			err := s.addClassItemWithTimeout(userID, class, classItem)
			if err != nil {
				return err
			}
			ids[classItem.EventID] = struct{}{}
		}
	}
	return nil
}

func ensureIDSet(m existingIDsMap, class string, hint int) idSet {
	if m[class] == nil {
		m[class] = make(idSet, hint)
	}
	return m[class]
}

func (s *calendarService) addClassItemWithTimeout(userID, class string, item *domain.ClassItem) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel() // safe: function scope ends quickly, no loop accumulation
	_, err := s.firebase.AddClassItem(ctx, userID, class, *item)
	return err
}
