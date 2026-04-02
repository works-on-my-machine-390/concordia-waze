import { IndoorMapPageParams } from "@/app/(drawer)/indoor-map";
import { COLORS } from "@/app/constants";
import { CloseIcon } from "@/app/icons";
import type { Floor } from "@/hooks/queries/indoorMapQueries";
import { useIndoorSearchStore } from "@/hooks/useIndoorSearchStore";
import BottomSheet, { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { BottomSheetStyles } from "../BuildingBottomSheet";

type PoiFilterBottomSheetProps = {
  poiType: string;
  poiLabel: string;
  floors: Floor[];
  onClose: () => void;
};

export default function PoiFilterBottomSheet({
  poiType,
  poiLabel,
  floors,
  onClose,
}: Readonly<PoiFilterBottomSheetProps>) {
  const snapPoints = useMemo(() => ["15%"], []);
  const params = useLocalSearchParams<IndoorMapPageParams>();

  const filteredPois = useIndoorSearchStore((s) => s.filteredPois);
  const searchFilter = useIndoorSearchStore((s) => s.selectedPoiFilter);
  const setFilteredPois = useIndoorSearchStore((s) => s.setFilteredPois);

  useEffect(() => {
    const filteredPois = floors
      .find((floor) => floor.number.toString() === params.selectedFloor)
      ?.pois?.filter((poi) => poi.type.toLowerCase() === poiType.toLowerCase());
    setFilteredPois(filteredPois || null);
  }, [params.selectedFloor, floors, poiType, searchFilter]);

  return (
    <BottomSheet
      handleComponent={null}
      index={0}
      snapPoints={snapPoints}
      enablePanDownToClose={false}
      enableContentPanningGesture
      enableDynamicSizing={false}
      detached
      backgroundStyle={BottomSheetStyles.bottomSheet}
      containerStyle={{ overflow: "visible" }}
    >
      <View style={BottomSheetStyles.fakeHandleContainer}></View>

      <View style={styles.header}>
        <Text style={styles.title}>{poiLabel}</Text>
        <Pressable onPress={onClose} style={BottomSheetStyles.closeIcon}>
          <CloseIcon size={28} />
        </Pressable>
      </View>

      <BottomSheetScrollView contentContainerStyle={styles.scrollContent}>
        <Text>
          There are {filteredPois?.length} {poiLabel.toLowerCase()} available on
          this floor.
        </Text>
      </BottomSheetScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
});
