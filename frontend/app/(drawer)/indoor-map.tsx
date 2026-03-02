import IndoorMapContainer from "@/components/indoor/IndoorMapContainer";
import IndoorMapHeader from "@/components/indoor/IndoorMapHeader";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { COLORS } from "../constants";

export default function IndoorMapPage() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    buildingCode?: string;
  }>();

  const buildingCode = params.buildingCode;
  const [searchText, setSearchText] = useState("");

  const handleSearchPress = () => {
    //searching for rooms, not doing anything rn
  };

  const handleSearchClear = () => {
    setSearchText("");
  };

  const handleBackToOutdoor = () => {
    router.push("/map");
  };

  return (
    <View style={styles.mapContainer}>
      <IndoorMapContainer buildingCode={buildingCode} />

      <IndoorMapHeader
        searchText={searchText}
        onSearchPress={handleSearchPress}
        onSearchClear={handleSearchClear}
        onBackToOutdoor={handleBackToOutdoor}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  mapContainer: {
    flex: 1,
    position: "relative",
  },
});
