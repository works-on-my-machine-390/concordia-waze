import BuildingBottomSheet from "@/components/BuildingBottomSheet";
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
import { Alert, StyleSheet, View } from "react-native";
import MapView, { Region } from "react-native-maps";
import { Toast } from "toastify-react-native";
import { isPointInPolygon } from "~/app/utils/pointInPolygon";
import CampusBuildingPolygons from "~/components/CampusBuildingPolygons";
import LocationButton from "~/components/LocationButton";
import { MapHeader } from "~/components/MapHeader";
import { NavigationHeader } from "~/components/NavigationHeader";
import NearbyResultsBottomSheet from "~/components/NearbyResultsBottomSheet";
import { getDistance } from "../utils/mapUtils";
import type { Poi } from "../utils/poi";
import { fetchPoisBackend } from "../utils/poi";

export default function MainMap() {
  const router = useRouter();
  const {
    selected,
    campus: campusParam,
    poiQuery: poiQueryParam,
    poiSearch: poiSearchParam,
    editMode,
    editValue,
    preserveEnd,
    preserveStart,
  } = useLocalSearchParams<{
    selected?: string;
    campus?: string;
    poiQuery?: string;
    poiSearch?: string;
    editMode?: string;
    editValue?: string;
    preserveEnd?: string;
    preserveStart?: string;
  }>();
  const [campus, setCampus] = useState<CampusCode>(CampusCode.SGW);
  const [searchText, setSearchText] = useState("");
  const [poiSheetOpen, setPoiSheetOpen] = useState(false);
  const [poiLoading, setPoiLoading] = useState(false);
  const [poiSortMode, setPoiSortMode] = useState<"relevance" | "distance">(
    "relevance",
  );
  const [poiRadiusM, setPoiRadiusM] = useState(1000);
  const [pois, setPois] = useState<Poi[]>([]);
  const [hasSearchedPois, setHasSearchedPois] = useState(false);
  const [poiQuery, setPoiQuery] = useState("restaurants");

  useEffect(() => {
    const q = typeof poiQueryParam === "string" ? poiQueryParam.trim() : "";
    const doPoiSearch = poiSearchParam === "1";

    if (!doPoiSearch || !q) return;

    setPoiQuery(q);
    setHasSearchedPois(true);
    setPoiSheetOpen(true);
  }, [poiQueryParam, poiSearchParam]);

  useEffect(() => {
    if (pois.length > 0) {
      setPoiSheetOpen(true);
    }
  }, [pois.length]);
  const [currentBuildingCode, setCurrentBuildingCode] = useState<string | null>(
    null,
  );
  const [selectedBuildingCode, setSelectedBuildingCode] = useState<
    string | null
  >(null);

  const [location, setLocation] = useState<Location.LocationObject | null>(
    null,
  );

  const [cameraCenter, setCameraCenter] = useState<{
    lat: number;
    lon: number;
  } | null>(null);

  type PoiWithDistance = Poi & { distanceM: number };

  const poisWithDistance = useMemo<PoiWithDistance[]>(() => {
    const userLocation = location?.coords;

    const withDistance = pois.map((p) => ({
      ...p,
      distanceM: userLocation
        ? getDistance(userLocation, { latitude: p.lat, longitude: p.lon }) *
          1000
        : null, // if the user's location is not available, we cannot compute distance.
      // This can happen if the user denied location permissions.
    }));

    const filterByDistancePredicate = (p: PoiWithDistance) => {
      // if distance is available, filter by radius
      if (poiRadiusM === 0) {
        return true; // show all POIs if radius is 0 (which means "All distances")
      }

      if (p.distanceM != null) {
        return p.distanceM <= poiRadiusM;
      }

      return true; // if distance is not available,
      // we will show the POI anyway since we don't want to hide results from users who denied location access.
      // we'll simply not show the distance for those POIs.
    };
    const withinRadius = withDistance.filter(filterByDistancePredicate);

    // Only sort by distance if user selected Distance
    return poiSortMode === "distance"
      ? withinRadius.sort((a, b) => a.distanceM - b.distanceM)
      : withinRadius;
  }, [
    pois,
    cameraCenter?.lat,
    cameraCenter?.lon,
    location?.coords?.latitude,
    location?.coords?.longitude,
    poiRadiusM,
    poiSortMode,
  ]);

  const [buildingsByCampus, setBuildingsByCampus] = useState<
    Record<string, CampusBuilding[]>
  >({});

  const [isNavigationMode, setIsNavigationMode] = useState(false);
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
    if (editMode) return;
    if (typeof selected === "string" && selected.length > 0) {
      setSelectedBuildingCode(selected);
    }
  }, [selected]);

  // Initialize campus from navigation params, if present
  useEffect(() => {
    if (typeof campusParam === "string") {
      const normalized = campusParam.toUpperCase();
      if (normalized === CampusCode.SGW || normalized === CampusCode.LOY) {
        setCampus(normalized as CampusCode);
        const coords = CAMPUS_COORDS[normalized as CampusCode];
        mapRef.current?.animateToRegion(
          {
            latitude: coords.latitude,
            longitude: coords.longitude,
            latitudeDelta: 0.005,
            longitudeDelta: 0.005,
          },
          500,
        );
      }
    }
  }, [campusParam]);

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
    return "Please select a building";
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

  useEffect(() => {
    let sub: Location.LocationSubscription | null = null;

    const startWatching = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          Alert.alert("Permission to access location was denied");
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
    if (!hasSearchedPois) return;
    if (!cameraCenter) return;

    setPoiLoading(true);
    setPois([]);

    fetchPoisBackend({
      query: poiQuery,
      center: {
        lat: cameraCenter.lat,
        lon: cameraCenter.lon,
      },
      sortMode: poiSortMode,
    })
      .then(setPois)
      .catch((e) => {
        console.error("POI search failed", e);
        setPois([]);
      })
      .finally(() => setPoiLoading(false));
  }, [
    cameraCenter?.lat,
    cameraCenter?.lon,
    hasSearchedPois,
    poiQuery,
    poiSortMode,
  ]);

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
          Alert.alert("Permission to access location was denied");
          return;
        }
        const current = await Location.getCurrentPositionAsync({});
        setLocation(current);
        coords = current.coords;
      }

      if (coords) {
        mapRef.current?.animateToRegion(
          {
            latitude: coords.latitude,
            longitude: coords.longitude,
            latitudeDelta: 0.005,
            longitudeDelta: 0.005,
          },
          500,
        );
      }
    } catch (e) {
      console.error("Failed to get to your location.", e);
      Toast.error("Failed to get your location. Please try again.");
    }
  };

  const handleCampusChange = (nextCampus: CampusCode) => {
    setCampus(nextCampus);
    const coords = CAMPUS_COORDS[nextCampus];
    mapRef.current?.animateToRegion(
      {
        latitude: coords.latitude,
        longitude: coords.longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      },
      500,
    );
  };

  // Handle map region changes to auto-switch campus
  const handleRegionChangeComplete = (region: Region) => {
    const { latitude, longitude } = region;
    setCameraCenter({ lat: latitude, lon: longitude });

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
    if (!location) {
      Toast.warn(
        "Location access was denied. Please select a start building.",
        "top",
      );
    }

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
    if (editMode && editValue) {
      if (editMode === "start") {
        setCustomStartBuilding(editValue);
        if (preserveEnd) {
          setSelectedBuildingCode(preserveEnd);
        }
        setIsNavigationMode(true);
      } else if (editMode === "end") {
        setSelectedBuildingCode(editValue);
        if (preserveStart) {
          setCustomStartBuilding(preserveStart);
        }
        setIsNavigationMode(true);
      }
    }
  }, [editMode, editValue, preserveEnd, preserveStart]);

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
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        }}
        onRegionChangeComplete={handleRegionChangeComplete}
      >
        <CampusBuildingPolygons
          buildings={buildingsToRender}
          highlightedCode={currentBuildingCode}
          selectedCode={selectedBuildingCode}
          onBuildingPress={setSelectedBuildingCode}
        />
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
          searchText={searchText}
          onSearchTextChange={(text) => {
            setSearchText(text);
          }}
          onSubmitSearch={(text) => {
            setPoiQuery(text.trim());
            setHasSearchedPois(true);
            setPoiSheetOpen(true);
          }}
          onMenuPress={() => {}}
        />
      )}
      <View style={styles.bottomSheetContainer}>
        <LocationButton
          onPress={goToMyLocation}
          bottomPosition={locationButtonPosition}
        />

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
          />
        )}
        <NearbyResultsBottomSheet
          visible={poiSheetOpen}
          loading={poiLoading}
          pois={poisWithDistance}
          sortMode={poiSortMode}
          radiusM={poiRadiusM}
          onClose={() => setPoiSheetOpen(false)}
          onChangeSort={setPoiSortMode}
          onChangeRadius={setPoiRadiusM}
          onSelectPoi={() => {}}
        />
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
