import * as Location from "expo-location";
import { useEffect, useRef, useState, useMemo } from "react";
import { Alert, StyleSheet, View } from "react-native";
import MapView, { Marker } from "react-native-maps";
import LocationButton from "../components/LocationButton";
import { MapHeader } from "../components/MapHeader";
import BuildingBottomSheet from '@/components/BuildingBottomSheet';

export default function MainMap() {
  const [campus, setCampus] = useState<"SGW" | "Loyola">("SGW");
  const [searchText, setSearchText] = useState("");

  const [location, setLocation] = useState<Location.LocationObject | null>(
    null,
  );
  const mapRef = useRef<MapView>(null);

  const CAMPUS_COORDS = {
    SGW: { latitude: 45.4972, longitude: -73.5791 }, // SGW campus
    Loyola: { latitude: 45.4589, longitude: -73.64 }, // Loyola campus
  };

  useEffect(() => {
    async function getCurrentLocation() {
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          Alert.alert("Permission to access location was denied");
          return;
        }

        let fetchedLocation = await Location.getCurrentPositionAsync({});
        setLocation(fetchedLocation);
      } catch (e) {
        console.error("Failed to get location.", e);
      }
    }

    getCurrentLocation();
  }, []);

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
      console.error("Failed to get to your location.");
      Alert.alert("Error", "Failed to get your location. Please try again.");
    }
  };

  const handleCampusChange = (nextCampus: "SGW" | "Loyola") => {
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
        ref={mapRef}
        showsMyLocationButton={false} // remove default google location button
        style={styles.map}
        showsUserLocation={true}
        initialRegion={{
          // coordinates for SGW campus (default)
          latitude: CAMPUS_COORDS.SGW.latitude,
          longitude: CAMPUS_COORDS.SGW.longitude,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        }}
      >
        {location?.coords && (
          <Marker
            coordinate={{
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
            }}
          />
        )}
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
