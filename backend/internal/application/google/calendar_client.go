package google

import (
	"context"
	"fmt"

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
		c.parseEvent(item)
	}

	return nil, err
}

func (c *CalendarClient) parseEvent(event *calendar.Event) *domain.ClassItem {
	name := event.Summary
	location := event.Location
	startTime := event.Start.DateTime
	endTime := event.End.DateTime

	fmt.Printf("Event: %s, Location: %s, Start: %s, End: %s\n ", name, location, startTime, endTime)

	return &domain.ClassItem{}

}
