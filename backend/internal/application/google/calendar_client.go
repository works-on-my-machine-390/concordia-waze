package google

import (
	"context"
	"fmt"
	"regexp"
	"strings"
	"time"

	"github.com/works-on-my-machine-390/concordia-waze/internal/domain"
	"github.com/works-on-my-machine-390/concordia-waze/internal/persistence/repository"
	"golang.org/x/oauth2"
	"google.golang.org/api/calendar/v3"
	"google.golang.org/api/option"
)

type CalendarGetter interface {
	GetCalendars(token *oauth2.Token) ([]string, error)
	GetCalendarEvents(token *oauth2.Token, startDate time.Time, calendarID string) (map[string][]*domain.ClassItem, []string, error)
}

type CalendarClient struct {
	buildingRepo *repository.BuildingDataRepository
}

func NewCalendarClient(buildingRepo *repository.BuildingDataRepository) *CalendarClient {
	return &CalendarClient{
		buildingRepo: buildingRepo,
	}
}

func (c *CalendarClient) GetCalendars(token *oauth2.Token) ([]string, error) {
	ctx := context.Background()

	config, err := oauthConfigFromEnv()
	if err != nil {
		return nil, err
	}
	service, err := calendar.NewService(ctx, option.WithTokenSource(config.TokenSource(ctx, token)))
	if err != nil {
		return nil, err
	}

	calendarList, err := service.CalendarList.List().Do()
	if err != nil {
		return nil, err
	}

	var calendarIDs []string
	for _, calendar := range calendarList.Items {
		calendarIDs = append(calendarIDs, calendar.Id)

	}
	return calendarIDs, nil
}

func (c *CalendarClient) GetCalendarEvents(token *oauth2.Token, startDate time.Time, calendarID string) (map[string][]*domain.ClassItem, []string, error) {
	classMap := make(map[string][]*domain.ClassItem)
	var errors []string

	ctx := context.Background()

	config, err := oauthConfigFromEnv()
	if err != nil {
		return nil, nil, err
	}
	service, err := calendar.NewService(ctx, option.WithTokenSource(config.TokenSource(ctx, token)))
	if err != nil {
		return nil, nil, err
	}

	endDate := startDate.Add(7 * 24 * time.Hour)
	tMin := startDate.Format(time.RFC3339)
	tMax := endDate.Format(time.RFC3339)

	events, err := service.Events.
		List(calendarID).
		ShowDeleted(false).
		SingleEvents(true). // Expands recurring events into individual instances
		TimeMin(tMin).
		TimeMax(tMax).
		OrderBy("startTime").
		Do()
	if err != nil {
		return nil, nil, err
	}

	// iterate through events and parse them into ClassItems, grouping by class ID
	for _, item := range events.Items {
		parsedEvent, err2 := c.parseEvent(item)
		if parsedEvent == nil {
			errors = append(errors, fmt.Sprintf("Failed to add Event %s: %s\n", item.Summary, err2))
			continue
		}

		classMap[parsedEvent.ClassID] = append(classMap[parsedEvent.ClassID], parsedEvent)
		if err2 != "" {
			errors = append(errors, fmt.Sprintf("Event %s: %s\n", item.Summary, err2))
		}
	}

	return classMap, errors, nil
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
		return nil, fmt.Sprintf("Error parsing date: %s", err)
	}

	classItem.Day = startTime.Weekday().String()
	classItem.StartTime = startTime.Format("15:04")

	endTime, err := time.Parse(time.RFC3339, event.End.DateTime)
	if err != nil {
		return nil, fmt.Sprintf("Error parsing date: %s", err)
	}
	classItem.EndTime = endTime.Format("15:04")

	// location parsing
	re = regexp.MustCompile(`^(.+?)(?:\s-\s(.+?))?(?:\sRm\s(.+))?$`)
	matches = re.FindStringSubmatch(event.Location)

	if matches == nil || (len(matches) < 3) {
		return &classItem, fmt.Sprintf("event location does not match expected format or only campus mentioned Campus - Building Rm RoomNumber: %s", event.Location)
	}

	if len(matches) >= 3 && strings.TrimSpace(matches[2]) != "" {
		// to do add building code from fuzz matching building name (create method in building repository that does this)
		classItem.BuildingCode, err = c.buildingRepo.GetBuildingByFuzzyLongName(matches[2])
		if err != nil {
			return nil, fmt.Sprintf("Error getting building code: %s", err)
		}
	}
	if len(matches) == 4 && strings.TrimSpace(matches[3]) != "" {
		classItem.Room = matches[3]
	}

	return &classItem, ""

}
