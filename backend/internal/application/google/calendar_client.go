package google

import (
	"context"
	"fmt"

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

	events, err := service.Events.List("primary").Do()

	fmt.Println(events)

	return nil, err
}
