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
import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import MapView, { Region } from "react-native-maps";
import { Toast } from "toastify-react-native";
import { isPointInPolygon } from "~/app/utils/pointInPolygon";
import CampusBuildingPolygons from "~/components/CampusBuildingPolygons";
import LocationButton from "~/components/LocationButton";
import { MapHeader } from "~/components/MapHeader";
import { NavigationHeader } from "~/components/NavigationHeader";
import { getDistance } from "../utils/mapUtils";
<<<<<<< 174-bottom-sheet-update
import ShuttleBusMarkers from "@/components/ShuttleBusMapMarkers";
import MapSettingsBottomSheet from "@/components/MapSettingsBottomSheet";
import MapSettingsButton from "@/components/MapSettingsButton";
=======
import { useLocalSearchParams } from "expo-router";
>>>>>>> dev

export default function MainMap() {
  // Get selectedBuilding parameter from URL (when navigating from Directory)
  const { selectedBuilding } = useLocalSearchParams<{ selectedBuilding?: string }>();

  const [campus, setCampus] = useState<CampusCode>(CampusCode.SGW);
  const [searchText, setSearchText] = useState("");
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
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const { data: userProfile } = useGetProfile();
  const saveToHistory = useSaveToHistory(userProfile?.id || "");

  const selectedBuildingDetails = useGetBuildingDetails(
    selectedBuildingCode || "",
  );
  const currentBuildingDetails = useGetBuildingDetails(
    currentBuildingCode || "",
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

  // Handle building selection from Directory page
  useEffect(() => {
    if (selectedBuilding && typeof selectedBuilding === 'string') {
      // Set the building as selected (this will open the bottom sheet)
      setSelectedBuildingCode(selectedBuilding);
    }
  }, [selectedBuilding]);

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
  }, [currentBuildingCode, currentBuildingDetails.data, location?.coords]);

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

  const handleBuildingPressed = (buildingCode: string) => {
    setSelectedBuildingCode(buildingCode);
    if (isSettingsOpen) setIsSettingsOpen(false);
  };

  // Handle map region changes to auto-switch campus
  const handleRegionChangeComplete = (region: Region) => {
    const { latitude, longitude } = region;

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

  const locationButtonPosition = useMemo(() => {
    if (isNavigationMode) {
      return 15;
    }

    if (selectedBuildingCode || isSettingsOpen) {
      return 25;
    }

    return 10;
  }, [selectedBuildingCode, isNavigationMode, isSettingsOpen]);

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
          onBuildingPress={handleBuildingPressed}
        />
        <ShuttleBusMarkers campus={campus} />
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
          }}
        />
      ) : (
        <MapHeader
          campus={campus}
          onCampusChange={handleCampusChange}
          searchText={searchText}
          onSearchTextChange={setSearchText}
          onMenuPress={() => {}}
        />
      )}
      <View style={styles.bottomSheetContainer}>
        <MapSettingsButton
          onPress={() => {
            if (selectedBuildingCode) {
              setSelectedBuildingCode(null); // close building bottom sheet if open
            }
            setIsSettingsOpen(!isSettingsOpen);
          }}
          bottomPositionPercentage={locationButtonPosition + 7}
        />
        <LocationButton
          onPress={goToMyLocation}
          bottomPositionPercentage={locationButtonPosition}
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
          />
        )}

        {isSettingsOpen && (
          <MapSettingsBottomSheet onClose={() => setIsSettingsOpen(false)} />
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