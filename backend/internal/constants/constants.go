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

	ShuttlePolylineLOYtoSGW = "msmtGnqmM\\iAHKBK_D}DP_@IIeA}Ac@s@s@}AIMgAqCQ_@mAqC}AoDcBaE_BqD_BuDiDcISo@q@oAUSG_@Oi@Sc@wBcFiDaI_@gAcAyBuD{IoFmMcAcCaA}B{@oB[y@kAuCoDuIuAkDm@qA_@}@GYcAaCwAkDkBwEgBcE{@uBs@qAeJ{KgKcMoEoFSUWSO[eAqAc@e@oDiEwAcBmEmFcGkHoFsGw@cAgAoAiByBgBwB{AgBYa@KUUi@Me@}@qDw@sCQa@[m@eDwEq@{@g@k@uBeCQM}AgBi@m@qAwA}@eAMQOGoAiBs@oA}A}CsDiH_@e@IUQQe@c@o@i@kFqEwBiBw@o@QWm@g@F[f@wBBe@LUJ[Je@T{@d@wALa@GCW[FMTi@v@_CPg@"
	ShuttlePolylineSGWtoLOY = "kxttG~uaMmAnDUh@GLVZFBM@Wv@[dASz@KZQ^?Zg@vBGZl@f@PVv@n@l@h@rExDpCCd@b@PPHT^d@Xh@lBvDlACnBrDnAhBNFLP|@dApAvAh@l@|AfBPLtBdCf@j@fBCnBpCZl@b@nAz@bDt@xCTh@JTX@zAfBv@~@BpB~BnCv@bAtABnEnFhHtI|KxMdApANZVRRTdAnAAjAhC|CrDpE|FHjEjFfAxAl@rAbAdCxCjHzAnD|AvDFX^|@l@pAjDtIdDIZx@z@nBvAdD~AxDdHvPlArCbAxB^fArA|CjDdIt@dBNh@F^TRp@nARn@fEzJjBnEBpDfBjEzBdFP^fApCHLr@|APVPZdA|AHHQ^~C|DCJIJ]hA"
)
