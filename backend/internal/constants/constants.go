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
	BuildingDataFile = "resource/building_information.json"
	// ShuttleDataFile is the filename for shuttle information data
	ShuttleDataFile = "resource/shuttle_information.json"

	// FloorDataFile is the filename for floor information data
	FloorDataFile = "resource/floor_information.json"

	// DefaultJWTDuration is the default duration for JWT tokens
	DefaultJWTDuration = 24 * 7 // 7 days

	// Campus labels
	LoyolaCampusCode            = "LOY"
	SirGeorgeWilliamsCampusCode = "SGW"
	LoyolaCampusName            = "Concordia University - Loyola Campus"
	SirGeorgeWilliamsCampusName = "Concordia University"

	MaxReturnedImageCount = 2

	// Google API rate limiter defaults (per client IP)
	DefaultGoogleRateLimitRPS   = 2.0
	DefaultGoogleRateLimitBurst = 5

	ShuttlePolylineLOYtoSGW = "ermtGxnm`MBK_D}DP_@IIeA}AQ[eAuBIMgAqCQ_@{BeFgBkEaBqDkBoEgE{JSo@q@oAUSG_@Oi@u@eBkDeIsA}C_@gAcAyBmAsCsC}GqFsMwAeD{@oB[y@eDaIkDuIm@qA_@}@GYcAaCYu@{AoD}AyD_CwFm@sAgAyAaK{LeKaM{CqDWSO[eAqAiC}C_F{F{D{EqJiLuAaBw@cA_CoCuFyGYa@KUUi@u@yC{@cDc@oA[m@oBqCgBaC}CqDQM}AgBi@m@qAwA}@eAMQOGoAiBoBsDmAaCqB_EUa@_@e@IUQQe@c@qCaCyHsGQWm@g@y@w@k@a@oBoB|@_C|@cCn@cBOMkAcA"
	ShuttlePolylineSGWtoLOY = "adutGjxa`MzApAwAxDYv@o@|AIVlAjA`@b@j@`@x@v@l@f@PVv@n@l@h@rExDpC`Cd@b@PPHT^d@Xh@lBvDlA`CnBrDnAhBNFLP|@dApAvAh@l@|AfBPLtBdCf@j@fB`CnBpCZl@b@nAz@bDt@xCTh@JTX`@zAfBv@~@`BpB~BnCv@bAtA`BnEnFhHtIfCzCtG|HdApANZVRRTdAnA`AjAhC|CrDpE|F`HjEjFfAxAl@rAbAdCxCjHzAnD|AvDFX^|@l@pAjDtIdD`IZx@z@nBvAdD~AxDdHvPlArCbAxB^fArA|CjDdIt@dBNh@F^TRp@nARn@fEzJjBnE`BpDfBjEzBdFP^fApCHLr@|APVPZdA|AHHQ^~C|DCJ"

	IndoorPathDistanceToMeterRatio  = 66.8
	IndoorPathStraightTurnThreshold = 0.966
	WalkingSpeedMps                 = 1.42
)
