import * as Location from "expo-location";
import { useEffect, useRef, useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import MapView from "react-native-maps";
import LocationButton from "~/components/LocationButton";
import { MapHeader } from "~/components/MapHeader";
import { Toast } from "toastify-react-native";

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
      console.error("Failed to get to your location.", e);
      Toast.error("Failed to get your location. Please try again.");
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
      ></MapView>

      <MapHeader
        campus={campus}
        onCampusChange={handleCampusChange}
        searchText={searchText}
        onSearchTextChange={setSearchText}
        onMenuPress={() => {}}
        // onMenuPress={() => router.push("/menu")} // navigate to menu screen, to be created
      />
      <LocationButton onPress={goToMyLocation} />
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
});
