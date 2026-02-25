import BuildingBottomSheet from "@/components/BuildingBottomSheet";
import PoiSearchBottomSheet from "@/components/poi/PoiSearchBottomSheet";
import {
  CampusBuilding,
  CampusCode,
  useGetBuildingDetails,
  useGetBuildings,
} from "@/hooks/queries/buildingQueries";
import { useSaveToHistory } from "@/hooks/queries/userHistoryQueries";
import { useGetProfile } from "@/hooks/queries/userQueries";
import * as Location from "expo-location";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import MapView, { Circle, Marker, Region } from "react-native-maps";
import { Toast } from "toastify-react-native";
import { isPointInPolygon } from "~/app/utils/pointInPolygon";
import CampusBuildingPolygons from "~/components/CampusBuildingPolygons";
import LocationButton from "~/components/LocationButton";
import { MapHeader } from "~/components/MapHeader";
import { NavigationHeader } from "~/components/NavigationHeader";
import {
  COLORS,
  DEFAULT_CAMERA_MOVE_DURATION_IN_MS,
  DEFAULT_MAP_DELTA,
} from "../constants";
import { getDistance } from "../utils/mapUtils";
import {
  DistanceFilterReferenceOptions,
  POI_DEFAULT_MAX_DISTANCE_IN_M,
  TextSearchRankPreferenceType,
} from "@/hooks/queries/poiQueries";

export type MapQueryParamsModel = {
  selected?: string;
  campus?: string;
  editMode?: "start" | "end";
  editValue?: string;
  preserveStart?: string;
  preserveEnd?: string;
  camLat?: string;
  camLng?: string;
} & MapPOIQueryParamsModel;

// the query parameters for camLat and camLng should be treated as source of truth,
// rather than creating a new state.
export type MapPOIQueryParamsModel = {
  query?: string;
  poiLat?: string;
  poiLng?: string;
  rankPref?: TextSearchRankPreferenceType; // "DISTANCE" or "RELEVANCE"
  maxDist?: string;
  distFilterReference?: DistanceFilterReferenceOptions; // "USER" or "CAMERA"
};

export default function MainMap() {
  const router = useRouter();
  const params = useLocalSearchParams<MapQueryParamsModel>();
  const [campus, setCampus] = useState<CampusCode>(CampusCode.SGW);
  const [currentBuildingCode, setCurrentBuildingCode] = useState<string | null>(
    null,
  );
  const [selectedBuildingCode, setSelectedBuildingCode] = useState<
    string | null
  >(null);

  const [location, setLocation] = useState<Location.LocationObject | null>(
    null,
  );

  const [buildingsByCampus, setBuildingsByCampus] = useState<
    Record<string, CampusBuilding[]>
  >({});

  const [isNavigationMode, setIsNavigationMode] = useState(false);
  const [isPoiMode, setIsPoiMode] = useState<boolean>(false);
  const [nearbyMarkerCoordinates, setNearbyMarkerCoordinates] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  const [customStartBuilding, setCustomStartBuilding] = useState<string | null>(
    null,
  );

  const { data: userProfile } = useGetProfile();
  const saveToHistory = useSaveToHistory(userProfile?.id || "");

  const selectedBuildingDetails = useGetBuildingDetails(
    selectedBuildingCode || undefined,
  );
  const currentBuildingDetails = useGetBuildingDetails(
    currentBuildingCode || undefined,
  );
  const customStartBuildingDetails = useGetBuildingDetails(
    customStartBuilding || undefined,
  );

  const buildingListQuery = useGetBuildings(campus);

  const moveCamera = (params: {
    latitude: number;
    longitude: number;
    delta?: number;
    duration?: number;
  }) => {
    if (mapRef.current) {
      mapRef.current.animateToRegion(
        {
          latitude: params.latitude,
          longitude: params.longitude,
          latitudeDelta: params.delta || DEFAULT_MAP_DELTA,
          longitudeDelta: params.delta || DEFAULT_MAP_DELTA,
        },
        params.duration || DEFAULT_CAMERA_MOVE_DURATION_IN_MS,
      );
    }
  };

  useEffect(() => {
    if (buildingListQuery.data) {
      setBuildingsByCampus((prev) => ({
        ...prev,
        [buildingListQuery.data.campus]: buildingListQuery.data.buildings || [],
      }));
    }
  }, [buildingListQuery.data]);

  // Initialize building selection from search params, if present
  useEffect(() => {
    if (params.editMode) return;
    if (typeof params.selected === "string" && params.selected.length > 0) {
      setSelectedBuildingCode(params.selected);
    }
  }, [params.selected]);

  useEffect(() => {
    if (params.query) {
      setIsPoiMode(true);

      const markerCoordinates =
        Number.parseFloat(params.poiLat) && Number.parseFloat(params.poiLng)
          ? {
              latitude: Number.parseFloat(params.poiLat),
              longitude: Number.parseFloat(params.poiLng),
            }
          : null;

      setNearbyMarkerCoordinates(markerCoordinates);
      setSelectedBuildingCode(null);
    } else {
      setIsPoiMode(false);
      setNearbyMarkerCoordinates(null);
    }
  }, [params.query]);

  useEffect(() => {
    console.log("Updating nearby marker coordinates based on params", {
      poiLat: params.poiLat,
      poiLng: params.poiLng,
    });
    setNearbyMarkerCoordinates(
      params.poiLat && params.poiLng
        ? {
            latitude: Number.parseFloat(params.poiLat),
            longitude: Number.parseFloat(params.poiLng),
          }
        : null,
    );

  }, [params.poiLat, params.poiLng]);

  // Initialize campus from navigation params, if present
  useEffect(() => {
    if (typeof params.campus === "string") {
      const normalized = params.campus.toUpperCase();
      if (normalized === CampusCode.SGW || normalized === CampusCode.LOY) {
        setCampus(normalized as CampusCode);
        const coords = CAMPUS_COORDS[normalized as CampusCode];
        moveCamera({
          latitude: coords.latitude,
          longitude: coords.longitude,
        });
      }
    }
  }, [params.campus]);

  const buildingsToRender = useMemo(() => {
    return buildingsByCampus[campus] || [];
  }, [campus, buildingsByCampus]);

  const [startAddress, setStartAddress] = useState<string | null>(null);

  // reverse geocoding to get address given coordinates
  useEffect(() => {
    const getAddress = async () => {
      if (location?.coords && !currentBuildingCode) {
        try {
          const addresses = await Location.reverseGeocodeAsync({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          });

          if (addresses && addresses.length > 0) {
            const addr = addresses[0];

            // street adress
            const street = [addr.streetNumber, addr.street]
              .filter(Boolean)
              .join(" ");

            // adding city, region and postal code to it
            const formattedAddress = [
              street,
              addr.city,
              addr.region,
              addr.postalCode,
            ]
              .filter(Boolean)
              .join(", ");

            setStartAddress(formattedAddress || "Current Location");
          }
        } catch (e) {
          console.error("Failed to get address", e);
          setStartAddress(null);
        }
      } else {
        setStartAddress(null);
      }
    };

    getAddress();
  }, [
    location?.coords?.latitude,
    location?.coords?.longitude,
    currentBuildingCode,
  ]);

  const startLocationText = useMemo(() => {
    // if user edits
    if (customStartBuilding && customStartBuildingDetails.data) {
      return `${customStartBuildingDetails.data.code} - ${customStartBuildingDetails.data.long_name}`;
    }
    // if user has location and is in a building
    if (currentBuildingCode && currentBuildingDetails.data) {
      return `${currentBuildingDetails.data.code} - ${currentBuildingDetails.data.long_name}`;
    }

    // if user has location but not in a building
    if (location?.coords) {
      return (
        startAddress ||
        `${location.coords.latitude.toFixed(5)}, ${location.coords.longitude.toFixed(5)}`
      );
    }

    // if no location available
    return "Select a start location";
  }, [
    customStartBuilding,
    customStartBuildingDetails.data,
    currentBuildingCode,
    currentBuildingDetails.data,
    location?.coords,
    startAddress,
  ]);

  const mapStyle = [
    {
      featureType: "poi",
      elementType: "all",
      stylers: [{ visibility: "off" }],
    },
  ];
  const mapRef = useRef<MapView>(null);

  const CAMPUS_COORDS = {
    [CampusCode.SGW]: { latitude: 45.4972, longitude: -73.5791 }, // SGW campus
    [CampusCode.LOY]: { latitude: 45.4589, longitude: -73.64 }, // Loyola campus
  };

  const initializeCameraCenterFromParams = () => {
    if (params.camLat && params.camLng) {
      const lat = Number.parseFloat(params.camLat);
      const lng = Number.parseFloat(params.camLng);
      if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
        setTimeout(() => {
          moveCamera({
            latitude: lat,
            longitude: lng,
            duration: 100,
          });
        }, 500);
      }
    }
  };

  useEffect(() => {
    initializeCameraCenterFromParams();

    let sub: Location.LocationSubscription | null = null;

    const startWatching = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          return;
        }

        sub = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 1000,
            distanceInterval: 1,
          },
          (loc) => {
            setLocation(loc);
          },
        );
      } catch (e) {
        console.error("Failed to watch location.", e);
      }
    };

    startWatching();

    return () => {
      sub?.remove();
    };
  }, []);

  useEffect(() => {
    if (!location?.coords) return;

    const point = {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    };

    let found: string | null = null;

    for (const b of Object.values(buildingsByCampus).flat()) {
      if (isPointInPolygon(point, b.polygon)) {
        found = b.code;
        break;
      }
    }

    setCurrentBuildingCode(found);
  }, [
    location?.coords?.latitude,
    location?.coords?.longitude,
    buildingsByCampus,
  ]);

  const goToMyLocation = async () => {
    try {
      let coords = location?.coords;
      if (!coords) {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          return;
        }
        const current = await Location.getCurrentPositionAsync({});
        setLocation(current);
        coords = current.coords;
      }

      if (coords) {
        moveCamera({
          latitude: coords.latitude,
          longitude: coords.longitude,
        });
      }
    } catch (e) {
      console.error("Failed to get to your location.", e);
      Toast.error("Failed to get your location. Please try again.");
    }
  };

  const handleCampusChange = (nextCampus: CampusCode) => {
    setCampus(nextCampus);
    const coords = CAMPUS_COORDS[nextCampus];
    moveCamera({
      latitude: coords.latitude,
      longitude: coords.longitude,
    });
  };

  // Handle map region changes to auto-switch campus
  const handleRegionChangeComplete = (region: Region) => {
    const { latitude, longitude } = region;

    router.setParams({
      query: params.query || "",
      camLat: String(latitude),
      camLng: String(longitude),
    });

    // Calculate distance to each campus
    const distanceToSGW = getDistance(
      { latitude, longitude },
      CAMPUS_COORDS[CampusCode.SGW],
    );
    const distanceToLOY = getDistance(
      { latitude, longitude },
      CAMPUS_COORDS[CampusCode.LOY],
    );

    // Determine which campus is closer
    const closestCampus =
      distanceToSGW < distanceToLOY ? CampusCode.SGW : CampusCode.LOY;

    // Update campus if different
    if (closestCampus !== campus) {
      setCampus(closestCampus);
    }
  };

  const handleStartNavigation = () => {
    setCustomStartBuilding(null);
    setIsNavigationMode(true);

    // Save the destination building to history
    if (userProfile?.id && selectedBuildingDetails.data) {
      saveToHistory.mutate({
        name: selectedBuildingDetails.data.long_name,
        address: selectedBuildingDetails.data.address,
        lat: selectedBuildingDetails.data.latitude,
        lng: selectedBuildingDetails.data.longitude,
        building_code: selectedBuildingDetails.data.code,
        destinationType: "building",
      });
    }
  };

  const getCampusForBuilding = useCallback(
    (buildingCode: string | null): CampusCode | undefined => {
      if (!buildingCode) return undefined;

      for (const [campusCode, buildings] of Object.entries(buildingsByCampus)) {
        if (buildings.some((b) => b.code === buildingCode)) {
          return campusCode as CampusCode;
        }
      }
      return undefined;
    },
    [buildingsByCampus],
  );

  const startCampus = useMemo(() => {
    // custom start building
    if (customStartBuilding) {
      return getCampusForBuilding(customStartBuilding);
    }

    // current building (user is inside a building)
    if (currentBuildingCode) {
      return getCampusForBuilding(currentBuildingCode);
    }

    // user's location but not in building (determine campus from coordinates)
    if (location?.coords) {
      const distanceToSGW = getDistance(
        {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        },
        CAMPUS_COORDS[CampusCode.SGW],
      );
      const distanceToLOY = getDistance(
        {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        },
        CAMPUS_COORDS[CampusCode.LOY],
      );

      return distanceToSGW < distanceToLOY ? CampusCode.SGW : CampusCode.LOY;
    }

    return undefined;
  }, [
    customStartBuilding,
    currentBuildingCode,
    location?.coords,
    getCampusForBuilding,
  ]);

  const endCampus = getCampusForBuilding(selectedBuildingCode);

  const handleStartLocationPress = () => {
    router.push({
      pathname: "/search",
      params: {
        campus,
        editMode: "start",
        preserveEnd: selectedBuildingCode || "",
        preserveStart: customStartBuilding || "",
      },
    });
  };

  const handleEndLocationPress = () => {
    router.push({
      pathname: "/search",
      params: {
        campus,
        editMode: "end",
        preserveEnd: selectedBuildingCode || "",
        preserveStart: customStartBuilding || "",
      },
    });
  };

  const locationButtonPosition = useMemo(() => {
    if (!selectedBuildingCode) {
      return 80;
    }
    return isNavigationMode ? 150 : 220;
  }, [selectedBuildingCode, isNavigationMode]);

  useEffect(() => {
    if (params.editMode && params.editValue) {
      if (params.editMode === "start") {
        setCustomStartBuilding(params.editValue);
        if (params.preserveEnd) {
          setSelectedBuildingCode(params.preserveEnd);
        }
        setIsNavigationMode(true);
      } else if (params.editMode === "end") {
        setSelectedBuildingCode(params.editValue);
        if (params.preserveStart) {
          setCustomStartBuilding(params.preserveStart);
        }
        setIsNavigationMode(true);
      }
    }
  }, [params]);

  const handleSearchBarClear = () => {
    router.setParams({
      query: "",
    });
  };

  const handlePolygonPress = (buildingCode: string) => {
    if (isPoiMode) {
      router.setParams({
        query: "",
      });
    }
    setSelectedBuildingCode(buildingCode);
  };

  const getNearbySearchRadius = () => {
    let radius = POI_DEFAULT_MAX_DISTANCE_IN_M;
    if (params.distFilterReference === DistanceFilterReferenceOptions.CAMERA) {
      radius = params.maxDist
        ? Number.parseInt(params.maxDist)
        : POI_DEFAULT_MAX_DISTANCE_IN_M;
    }
    return radius;
  };

  return (
    <View style={styles.container}>
      <MapView
        customMapStyle={mapStyle}
        showsPointsOfInterest={false}
        ref={mapRef}
        showsMyLocationButton={false} // remove default google location button
        style={styles.map}
        showsUserLocation={true}
        initialRegion={{
          // coordinates for SGW campus (default)
          latitude: CAMPUS_COORDS[CampusCode.SGW].latitude,
          longitude: CAMPUS_COORDS[CampusCode.SGW].longitude,
          latitudeDelta: DEFAULT_MAP_DELTA,
          longitudeDelta: DEFAULT_MAP_DELTA,
        }}
        onRegionChangeComplete={handleRegionChangeComplete}
      >
        <CampusBuildingPolygons
          buildings={buildingsToRender}
          highlightedCode={currentBuildingCode}
          selectedCode={selectedBuildingCode}
          onBuildingPress={handlePolygonPress}
        />

        {nearbyMarkerCoordinates && (
          <>
            <Marker
              pinColor={COLORS.selectionBlue}
              coordinate={nearbyMarkerCoordinates}
            />
            <Circle
            strokeColor={COLORS.selectionBlue}
            fillColor={COLORS.selectionBlueBg}
              center={nearbyMarkerCoordinates}
              radius={getNearbySearchRadius()}
            />
          </>
        )}
      </MapView>

      {isNavigationMode ? (
        <NavigationHeader
          startLocation={startLocationText}
          endLocation={
            selectedBuildingDetails.data
              ? `${selectedBuildingDetails.data.code} - ${selectedBuildingDetails.data.long_name}`
              : selectedBuildingCode || "Unknown Building"
          }
          onCancel={() => {
            setIsNavigationMode(false);
            setSelectedBuildingCode(null);
            setCustomStartBuilding(null);
          }}
          onStartLocationPress={handleStartLocationPress}
          onEndLocationPress={handleEndLocationPress}
        />
      ) : (
        <MapHeader
          campus={campus}
          onCampusChange={handleCampusChange}
          searchText={params.query || ""}
          onSearchClear={handleSearchBarClear}
          onMenuPress={() => {}}
        />
      )}
      <View style={styles.bottomSheetContainer}>
        <LocationButton
          onPress={goToMyLocation}
          bottomPosition={locationButtonPosition}
        />

        {isPoiMode && (
          <PoiSearchBottomSheet
            moveCamera={moveCamera}
            onClose={() => router.setParams({ query: "" })}
            onDirectionsPress={() => {}}
            // TODO: generalize directions for POI
          />
        )}

        {!!selectedBuildingCode && (
          <BuildingBottomSheet
            buildingCode={selectedBuildingCode}
            onClose={() => {
              setSelectedBuildingCode(null);
              setIsNavigationMode(false);
            }}
            onStartNavigation={handleStartNavigation}
            isNavigationMode={isNavigationMode}
            startCampus={startCampus}
            endCampus={endCampus}
            hasLocation={!!location || !!customStartBuilding}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  bottomSheetContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
});
