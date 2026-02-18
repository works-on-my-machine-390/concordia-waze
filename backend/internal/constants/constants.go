package constants

import (
	"github.com/works-on-my-machine-390/concordia-waze/internal/domain"
)

var (
	SGWCampusPosition = domain.LatLng{
		Lat: 45.49501676578633, Lng: -73.57789134358363,
	}

	LOYCampusPosition = domain.LatLng{
		Lat: 45.458410340417004, Lng: -73.63684612372252,
	}

	SGWShuttleStopPosition = domain.LatLng{
		Lat: 45.497163, Lng: -73.578535}

	LOYShuttleStopPosition = domain.LatLng{
		Lat: 45.458424, Lng: -73.638369,
	}
)

const (
	// BuildingDataFile is the filename for building information data
	BuildingDataFile = "building_information.json"
	// ShuttleDataFile is the filename for shuttle information data
	ShuttleDataFile = "shuttle_information.json"

	// DefaultJWTDuration is the default duration for JWT tokens
	DefaultJWTDuration = 24 * 7 // 7 days

	// Campus labels
	LoyolaCampusCode            = "LOY"
	SirGeorgeWilliamsCampusCode = "SGW"
	LoyolaCampusName            = "Concordia University - Loyola Campus"
	SirGeorgeWilliamsCampusName = "Concordia University"
)
