import FontAwesome5 from "@expo/vector-icons/FontAwesome5";
import { CampusCode } from "@/hooks/queries/buildingQueries";
import { useGetShuttlePositions } from "@/hooks/queries/shuttleQueries";
// import useMapSettings from "@/hooks/useMapSettings";
import { Marker } from "react-native-maps";
import { StyleSheet, View } from "react-native";
import { COLORS } from "@/app/constants";

type Props = {};

export default function ShuttleBusMarkers({}: Readonly<Props>) {
  //   const { mapSettings } = useMapSettings();

  const shuttleMarkerQuery = useGetShuttlePositions();

  const shuttlePositions = shuttleMarkerQuery.data;

  if (
    // !mapSettings.showShuttleStops ||
    shuttleMarkerQuery.isLoading ||
    !shuttlePositions
  ) {
    return null;
  }

  return (
    <>
      <Marker
        coordinate={{
          latitude: shuttlePositions?.LOY.lat,
          longitude: shuttlePositions?.LOY.lng,
        }}
        title="Shuttle Bus Stop - LOY"
        description="Loyola Campus Shuttle Stop"
        anchor={{ x: 0.5, y: 0.5 }}
      >
        <View style={styles.shuttleMarker}>
          <FontAwesome5 name="shuttle-van" size={16} color="black" />
        </View>
      </Marker>
      <Marker
        coordinate={{
          latitude: shuttlePositions?.SGW.lat,
          longitude: shuttlePositions?.SGW.lng,
        }}
        title="Shuttle Bus Stop - SGW"
        description="SGW Campus Shuttle Stop"
        anchor={{ x: 0.5, y: 0.5 }}
      >
        <View style={styles.shuttleMarker}>
          <FontAwesome5 name="shuttle-van" size={16} color="black" />
        </View>
      </Marker>
    </>
  );
}

const styles = StyleSheet.create({
  shuttleMarker: {
    backgroundColor: COLORS.background,
    padding: 4,
    borderRadius: 32,
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.goldDark,
  },
});
