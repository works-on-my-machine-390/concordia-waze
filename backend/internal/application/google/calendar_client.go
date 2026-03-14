package google

import (
	"context"
	"fmt"
	"regexp"
	"strings"
	"time"

	"github.com/works-on-my-machine-390/concordia-waze/internal/domain"
	"golang.org/x/oauth2"
	"google.golang.org/api/calendar/v3"
	"google.golang.org/api/option"
)

type CalendarGetter interface {
	GetCalendarEvents(token *oauth2.Token) ([]string, error)
}

type CalendarClient struct {
}

func NewCalendarClient() *CalendarClient {
	return &CalendarClient{}
}

func (c *CalendarClient) GetCalendarEvents(token *oauth2.Token) ([]string, error) {
	ctx := context.Background()

	config, err := oauthConfigFromEnv()
	if err != nil {
		return nil, err
	}
	service, err := calendar.NewService(ctx, option.WithTokenSource(config.TokenSource(ctx, token)))
	if err != nil {
		return nil, err
	}

	events, err := service.Events.List("primary").MaxResults(1).Do()

	fmt.Println(events, err)
	for _, item := range events.Items {
		parsedEvent, err2 := c.parseEvent(item)
		if parsedEvent == nil {
			fmt.Printf("Failed to parse event: %v\n", err2)
			continue
		}

	}

	return nil, err
}

func (c *CalendarClient) parseEvent(event *calendar.Event) (*domain.ClassItem, string) {

	var classItem domain.ClassItem
	id := event.Id
	if event.RecurringEventId != "" {
		id = event.RecurringEventId
	}
	classItem.EventID = id
	classItem.Origin = "google"

	// name matching
	// name should be in format "AAAA 000 AAA" where A is a capital letter and 0 is a digit, e.g. "COMP 202 LEC"
	name := event.Summary
	re := regexp.MustCompile(`^\s*([A-Z]{4} \d{3}) ([A-Z]{3})$`)
	matches := re.FindStringSubmatch(name)
	if matches == nil {
		return nil, fmt.Sprintf("event name does not match expected format AAAA 000 AAA: %s", name)
	}
	classItem.ClassID = matches[1]
	classItem.Type = strings.ToLower(matches[2])

	// date parsing
	startTime, err := time.Parse(time.RFC3339, event.Start.DateTime)
	if err != nil {
		return nil, fmt.Sprintf("Error parsing date:", err)
	}

	classItem.Day = startTime.Weekday().String()
	classItem.StartTime = startTime.Format("15:04")

	endTime, err := time.Parse(time.RFC3339, event.End.DateTime)
	if err != nil {
		return nil, fmt.Sprintf("Error parsing date:", err)
	}
	classItem.EndTime = endTime.Format("15:04")

	// location parsing
	re = regexp.MustCompile(`^(.+?)(?:\s-\s(.+?))?(?:\sRm\s(.+))?$`)
	matches = re.FindStringSubmatch(event.Location)

	if len(matches) == 2 {
		// to do add building code from fuzz matching building name (create method in building repository that does this)
		classItem.BuildingCode = matches[2]
		return &classItem, fmt.Sprintf("Error could not find room number000")
	} else if len(matches) == 3 {
		classItem.BuildingCode = matches[1]
		classItem.Room = matches[2]
		return &classItem, ""
	} else {
		return &classItem, fmt.Sprintf("Error parsing location, does not match expected format: %s", event.Location)
	}

}
