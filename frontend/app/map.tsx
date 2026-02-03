import React from "react";
import { useState, useEffect, useRef } from 'react';
import { StyleSheet, View } from "react-native";
import MapView, { Marker } from "react-native-maps";
import * as Location from 'expo-location'
import LocationButton from "../components/LocationButton";
import { MapHeader } from "../components/MapHeader";
import { useRouter } from "expo-router";


export default function Map() {
  const router = useRouter();
  const [campus, setCampus] = useState<"SGW" | "Loyola">("SGW");
  const [searchText, setSearchText] = useState("");

 const [location, setLocation] = useState<Location.LocationObject | null>(null);
 const [errorMsg, setErrorMsg] = useState<string | null>(null);
 const mapRef = useRef<MapView>(null);
 useEffect(() => {
    async function getCurrentLocation() {
      
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Permission to access location was denied');
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      setLocation(location);
    }

    getCurrentLocation();
  }, []);

  // need to test permissions on Android. Works on iOS
  const goToMyLocation = async () => {
    try {
      let coords = location?.coords;
      if (!coords) {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setErrorMsg('Permission to access location was denied');
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
          500
        );
      }
    } catch (e) {
      setErrorMsg('Failed to get location');
    }
  };
  
  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        showsMyLocationButton={false} // remove default google location button 
        style={styles.map}
        showsUserLocation={true}
        initialRegion={{
        // coordinates for SGW campus
          latitude: 45.4970,
          longitude: -73.5781,
          latitudeDelta: 0.005,  
          longitudeDelta: 0.005,
        }}
      />
      {location?.coords && (
        <Marker
          coordinate={{
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          }}

        />
      )}

       
      <MapHeader
        campus={campus}
        onCampusChange={setCampus}
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
