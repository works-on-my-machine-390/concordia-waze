import { MapPOIQueryParamsModel } from "@/app/(drawer)/map";
import { COLORS } from "@/app/constants";
import { poiMarkerStyles } from "@/app/styles/poi/poiStyle";
import { useGetNearbyPoi } from "@/hooks/queries/poiQueries";
import Ionicons from "@expo/vector-icons/build/Ionicons";
import { useLocalSearchParams } from "expo-router";
import { useMemo } from "react";
import { View } from "react-native";
import { Marker } from "react-native-maps";

export default function PoiOutdoorMarkers() {
  const params = useLocalSearchParams<MapPOIQueryParamsModel>();
  const poiSearchQuery = useGetNearbyPoi(
    params.query,
    Number.parseFloat(params.poiLat),
    Number.parseFloat(params.poiLng),
    params.rankPref,
  );

  const results = useMemo(() => {
    if (poiSearchQuery.isLoading || !poiSearchQuery.data) {
      return [];
    }
    return poiSearchQuery.data.data.map((poi) => ({
      ...poi,
      latitude: Number(poi.latitude),
      longitude: Number(poi.longitude),
    }));
  }, [
    params.poiLat,
    params.poiLng,
    params.query,
    params.rankPref,
    poiSearchQuery.data,
  ]);

  // there's a bug in the version of react-native-maps we're using
  // where the markers get cut off if they're larger than 100x100
  // a fix is available in 1.23.12, but expo enforces 1.20.1
  // see https://github.com/react-native-maps/react-native-maps/pull/5103
  // for now (and likely forever) we won't render the titles next to the markers

  return (
    <>
      {results?.map((poi) => (
        <Marker
          key={poi.code}
          coordinate={{ latitude: poi.latitude, longitude: poi.longitude }}
          anchor={{ x: 0.5, y: 0.5 }}
          title={poi.name}
          description={poi.address}
        >
          <View style={{ display: "flex", flexDirection: "row" }}>
            <View style={poiMarkerStyles.marker}>
              <Ionicons name="location" size={18} color={COLORS.background} />
            </View>
          </View>
        </Marker>
      ))}
    </>
  );
}
