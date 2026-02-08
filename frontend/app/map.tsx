import {
  CampusBuilding,
  CampusCode,
  useGetBuildings,
} from "@/hooks/queries/buildingQueries";
import * as Location from "expo-location";
import { useEffect, useRef, useState, useMemo } from "react";
import { Alert, StyleSheet, View } from "react-native";
import MapView, { Region } from "react-native-maps";
import { isPointInPolygon } from "../app/utils/pointInPolygon";
import CampusBuildingPolygons from "../components/CampusBuildingPolygons";
import LocationButton from "../components/LocationButton";
import { MapHeader } from "../components/MapHeader";
import BuildingBottomSheet from '@/components/BuildingBottomSheet';
import { getDistance } from "./utils/mapUtils";

export default function MainMap() {
  const [campus, setCampus] = useState<CampusCode>(CampusCode.SGW);
  const [searchText, setSearchText] = useState("");
  const [currentBuildingCode, setCurrentBuildingCode] = useState<string | null>(
    null,
  );

  const [location, setLocation] = useState<Location.LocationObject | null>(
    null,
  );

  const [buildingsByCampus, setBuildingsByCampus] = useState<
    Record<string, CampusBuilding[]>
  >({});

  const buildingListQuery = useGetBuildings(campus);

  useEffect(() => {
    if (buildingListQuery.data) {
      setBuildingsByCampus((prev) => ({
        ...prev,
        [buildingListQuery.data.campus]: buildingListQuery.data.buildings || [],
      }));
    }
  }, [buildingListQuery.data]);

  const buildingsToRender = useMemo(() => {
    return buildingsByCampus[campus] || [];
  }, [campus, buildingsByCampus]);

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
      Alert.alert("Error", "Failed to get your location. Please try again.");
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

  // Mock building for bottom sheet because no building selection yet
  const mockBuilding = useMemo(
    () => ({
      name: 'John Molson Building',
      acronym: 'MB',
      address: '1450 Guy St, Montreal',
      services: [
        "Career Management Service",
        "First Stop",
        "John Molson Executive Centre",
        "Performing Arts Faciliting",
        "Zen Den",
      ],
      departments: [
        "Accountacy",
        "Contemporary Dance",
        "Executive MBA Program",
        "Finance",
        "Goodman Institute of Investment Management",
        "Mangement",
        "Marketing",
        "Music",
        "Supply Chain & Business Technology Management",
        "Theatre",
        "Accolknuntacy",
        "Contempivgorary Dance",
        "Executivekjb MBA Program",
        "Finankjbce",
        "Goodkjbman Institute of Investment Management",
        "Mangekjhbment",
        "Markekjbting",
        "Muskjbic",
        "Sujbpply Chain & Business Technology Management",
        "Theakjbtre",
        "fbvfdb",
        "vfbfdv",
        "vbefgbr",
        "vsvdfv",
        "vefrvgerfv",
        "fvefvefbv",
        "bfbegfb",
        "fvfbgbeD",
        "fbefbb",
      ],
      accessibility: {
        wheelchair: true,
        elevator: true,
        escalator: true,
      },
    }),
    []
  );

  return (
    <View style={styles.container}>
      <MapView
        customMapStyle={mapStyle}
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
        />
      </MapView>

      <MapHeader
        campus={campus}
        onCampusChange={handleCampusChange}
        searchText={searchText}
        onSearchTextChange={setSearchText}
        onMenuPress={() => {}}
        // onMenuPress={() => router.push("/menu")} // navigate to menu screen, to be created
      />
      <LocationButton onPress={goToMyLocation} />
      <View style={styles.bottomSheetContainer}>
        <BuildingBottomSheet building={mockBuilding} />
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
    position: 'absolute',
    top: 0, 
    left: 0,
    right: 0,
    bottom: 0,
  },
});
