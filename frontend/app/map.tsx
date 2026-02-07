import * as Location from "expo-location";
import { useEffect, useRef, useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import MapView, { Marker } from "react-native-maps";
import LocationButton from "../components/LocationButton";
import { MapHeader } from "../components/MapHeader";
import CampusBuildingPolygons from "../components/CampusBuildingPolygons";
import { isPointInPolygon } from "../app/utils/pointInPolygon";
import { polygonToMapCoords } from "../app/utils/polygonMapper";
import { CAMPUS_BUILDINGS } from "../app/utils/campusBuildings";

export default function MainMap() {
  const [campus, setCampus] = useState<"SGW" | "Loyola">("SGW");
  const [searchText, setSearchText] = useState("");
  const [currentBuildingCode, setCurrentBuildingCode] = useState<string | null>(null);

  const [location, setLocation] = useState<Location.LocationObject | null>(
    null,
  );
  const mapRef = useRef<MapView>(null);

  const CAMPUS_COORDS = {
    SGW: { latitude: 45.4972, longitude: -73.5791 }, // SGW campus
    Loyola: { latitude: 45.4589, longitude: -73.64 }, // Loyola campus
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
          console.log("location update:", loc.coords.latitude, loc.coords.longitude);
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

  const buildings = campus === "Loyola" ? CAMPUS_BUILDINGS.LOY : CAMPUS_BUILDINGS.SGW;

  let found: string | null = null;

  for (const b of buildings) {
    if (!b.shape || b.shape.type !== "Polygon") continue;

    const poly = polygonToMapCoords(b.shape.coordinates);
    if (isPointInPolygon(point, poly)) {
      found = b.code;
      break;
    }
  }

  setCurrentBuildingCode(found);
}, [location?.coords?.latitude, location?.coords?.longitude]);


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

        <CampusBuildingPolygons
           campus={campus === "Loyola" ? "LOY" : "SGW"}
           highlightedCode={currentBuildingCode}
      />



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
