package application

import (
	"context"
	"errors"
	"fmt"
	"testing"
	"time"

	"github.com/stretchr/testify/require"
	"github.com/works-on-my-machine-390/concordia-waze/internal/domain"
	"golang.org/x/oauth2"
)

type fakeCalGetter struct {
	events    map[string][]*domain.ClassItem
	errs      []string
	err       error
	lastToken *oauth2.Token
	lastDay   time.Time
	lastCalID string
	calledGet bool
}

func (f *fakeCalGetter) GetCalendars(token *oauth2.Token) ([]string, error) {
	return nil, nil
}

func (f *fakeCalGetter) GetCalendarEvents(token *oauth2.Token, startDate time.Time, calendarID string) (map[string][]*domain.ClassItem, []string, error) {
	f.calledGet = true
	f.lastToken = token
	f.lastDay = startDate
	f.lastCalID = calendarID
	return f.events, f.errs, f.err
}

type fakeFirebase struct {
	// returned by GetAllClassItems
	existing map[string][]*domain.ClassItem
	getErr   error

	// AddClassItem behavior
	addErr   error
	addCalls []addCall
}

type addCall struct {
	ctx    context.Context
	userID string
	title  string
	item   domain.ClassItem
}

func (f *fakeFirebase) CreateClass(ctx context.Context, userID, title string) error {
	return nil
}
func (f *fakeFirebase) GetUserClasses(ctx context.Context, userID string) ([]string, error) {
	return nil, nil
}
func (f *fakeFirebase) DeleteClass(ctx context.Context, userID, title string) error {
	return nil
}
func (f *fakeFirebase) AddClassItem(ctx context.Context, userID, title string, item domain.ClassItem) (string, error) {
	// record the call
	f.addCalls = append(f.addCalls, addCall{ctx: ctx, userID: userID, title: title, item: item})
	if f.addErr != nil {
		return "", f.addErr
	}
	// return a deterministic id for assertions
	return fmt.Sprintf("added-%s-%d", title, len(f.addCalls)), nil
}
func (f *fakeFirebase) GetClassItems(ctx context.Context, userID, title string) ([]*domain.ClassItem, error) {
	return nil, nil
}
func (f *fakeFirebase) GetAllClassItems(userID string) (map[string][]*domain.ClassItem, error) {
	if f.getErr != nil {
		return nil, f.getErr
	}
	return f.existing, nil
}
func (f *fakeFirebase) UpdateClassItem(ctx context.Context, userID, title, classID string, updates map[string]interface{}) error {
	return nil
}
func (f *fakeFirebase) DeleteClassItem(ctx context.Context, userID, title, classID string) error {
	return nil
}

func (f *fakeFirebase) GetNextClass(userID string) (string, *domain.ClassItem, error) {
	return "", nil, nil
}

// --- tests ---

func TestSyncCalendarEvents_AddsNewItemsAndReturnsEventsAndErrors(t *testing.T) {
	calGetter := &fakeCalGetter{
		events: map[string][]*domain.ClassItem{
			"COMP 202": {
				{
					EventID: "evt-1",
					Origin:  "google",
					ClassID: "COMP 202",
				},
			},
		},
		errs: []string{"some parse warning"},
		err:  nil,
	}

	fb := &fakeFirebase{
		existing: map[string][]*domain.ClassItem{}, // no existing items -> should add
	}

	svc := NewCalendarService(calGetter, fb)

	events, errs, err := svc.SyncCalendarEvents(&oauth2.Token{AccessToken: "x"}, "user-123", time.Now(), "primary")
	require.NoError(t, err)
	require.Equal(t, calGetter.events, events)
	require.Equal(t, calGetter.errs, errs)

	// ensure AddClassItem was called once for the single event
	require.Len(t, fb.addCalls, 1)
	call := fb.addCalls[0]
	require.Equal(t, "user-123", call.userID)
	require.Equal(t, "COMP 202", call.title)
	require.Equal(t, "evt-1", call.item.EventID)
}

func TestSyncCalendarEvents_DoesNotAddWhenEventAlreadyExists(t *testing.T) {
	calGetter := &fakeCalGetter{
		events: map[string][]*domain.ClassItem{
			"COMP 202": {
				{EventID: "evt-dup", Origin: "google", ClassID: "COMP 202"},
			},
		},
	}

	// existing contains same EventID so AddClassItem should NOT be called
	fb := &fakeFirebase{
		existing: map[string][]*domain.ClassItem{
			"COMP 202": {
				{EventID: "evt-dup", Origin: "google", ClassID: "COMP 202"},
			},
		},
	}

	svc := NewCalendarService(calGetter, fb)

	events, errs, err := svc.SyncCalendarEvents(nil, "u1", time.Now(), "primary")
	require.NoError(t, err)
	require.Equal(t, calGetter.events, events)
	require.Nil(t, errs)
	require.Len(t, fb.addCalls, 0)
}

func TestSyncCalendarEvents_CalendarGetterErrorPropagates(t *testing.T) {
	wantErr := errors.New("calendar failure")
	calGetter := &fakeCalGetter{
		err: wantErr,
	}

	fb := &fakeFirebase{
		existing: map[string][]*domain.ClassItem{},
	}

	svc := NewCalendarService(calGetter, fb)

	_, _, err := svc.SyncCalendarEvents(nil, "u2", time.Now(), "primary")
	require.ErrorIs(t, err, wantErr)
}

func TestSyncCalendarEvents_GetAllClassItemsErrorPropagates(t *testing.T) {
	calGetter := &fakeCalGetter{
		events: map[string][]*domain.ClassItem{
			"COMP 202": {
				{EventID: "evt-1", Origin: "google", ClassID: "COMP 202"},
			},
		},
	}

	want := errors.New("firestore list error")
	fb := &fakeFirebase{
		getErr: want,
	}

	svc := NewCalendarService(calGetter, fb)

	_, _, err := svc.SyncCalendarEvents(nil, "u3", time.Now(), "primary")
	require.ErrorIs(t, err, want)
}

func TestSyncCalendarEvents_AddClassItemErrorPropagates(t *testing.T) {
	calGetter := &fakeCalGetter{
		events: map[string][]*domain.ClassItem{
			"COMP 202": {
				{EventID: "evt-new", Origin: "google", ClassID: "COMP 202"},
			},
		},
	}

	want := errors.New("add failed")
	fb := &fakeFirebase{
		existing: map[string][]*domain.ClassItem{}, // no existing so will attempt to add
		addErr:   want,
	}

	svc := NewCalendarService(calGetter, fb)

	_, _, err := svc.SyncCalendarEvents(nil, "u4", time.Now(), "primary")
	require.ErrorIs(t, err, want)
}
