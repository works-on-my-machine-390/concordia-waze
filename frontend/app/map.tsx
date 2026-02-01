import React from "react";
import { StyleSheet, View } from "react-native";
import MapView from "react-native-maps";

export default function Map() {
  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        initialRegion={{
        // coordinates for SGW campus
          latitude: 45.4970,
          longitude: -73.5781,
          latitudeDelta: 0.005,  
          longitudeDelta: 0.005,
        }}
      />
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
