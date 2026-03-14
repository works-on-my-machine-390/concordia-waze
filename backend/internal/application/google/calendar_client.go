package google

import (
	"context"
	"fmt"
	"regexp"
	"strings"

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
		if err2 != nil {
			fmt.Printf("Failed to parse event: %v\n", err2)
			continue
		}
	}

	return nil, err
}

func (c *CalendarClient) parseEvent(event *calendar.Event) (*domain.ClassItem, string) {

	var classItem domain.ClassItem

	name := event.Summary
	re := regexp.MustCompile(`^\s*([A-Z]{4} \d{3}) ([A-Z]{3})$`)
	matches := re.FindStringSubmatch(name)
	if matches == nil {
		return nil, fmt.Sprintf("event name does not match expected format AAAA 000 AAA: %s", name)
	}
	classItem.ClassID = matches[1]
	classItem.Type = strings.ToLower(matches[2])

	location := event.Location
	startTime := event.Start.DateTime
	endTime := event.End.DateTime

	fmt.Printf("Event: %s, Location: %s, Start: %s, End: %s\n ", name, location, startTime, endTime)

	return &domain.ClassItem{}, ""

}
