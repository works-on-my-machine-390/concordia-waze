import { COLORS } from "@/app/constants";
import { CloseIcon } from "@/app/icons";
import type { Floor } from "@/hooks/queries/indoorMapQueries";
import BottomSheet, { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { BottomSheetStyles } from "../BuildingBottomSheet";
import FloorFilterChips from "./FloorFilterChips";
import PoiListSection from "./PoiListSection";

type PoiFilterBottomSheetProps = {
  poiType: string;
  poiLabel: string;
  floors: Floor[];
  buildingCode: string;
  onPoiSelect: (roomCode: string, floorNumber: number) => void;
  onClose: () => void;
};

type PoiItem = {
  name: string;
  floor: number;
};

type Section = {
  title: string;
  data: PoiItem[];
};

export default function PoiFilterBottomSheet({
  poiType,
  poiLabel,
  floors,
  buildingCode,
  onPoiSelect,
  onClose,
}: Readonly<PoiFilterBottomSheetProps>) {
  const [selectedFloorFilter, setSelectedFloorFilter] = useState<number | null>(
    null,
  );
  const snapPoints = useMemo(() => ["50%", "90%"], []);

  const sections: Section[] = useMemo(() => {
    const floorGroups: Record<number, PoiItem[]> = {};

    for (const floor of floors) {
      if (
        selectedFloorFilter !== null &&
        floor.number !== selectedFloorFilter
      ) {
        continue;
      }

      const poisOfType = floor.pois.filter(
        (poi) => poi.type.toLowerCase() === poiType.toLowerCase(),
      );

      if (poisOfType.length > 0) {
        floorGroups[floor.number] = poisOfType.map((poi) => ({
          name: poi.name,
          floor: floor.number,
        }));
      }
    }

    return Object.entries(floorGroups)
      .sort(([a], [b]) => Number.parseInt(a, 10) - Number.parseInt(b, 10))
      .map(([floorNum, pois]) => ({
        title: `Floor ${floorNum}`,
        data: pois,
      }));
  }, [floors, poiType, selectedFloorFilter]);

  const availableFloors = useMemo(() => {
    return floors
      .filter((floor) =>
        floor.pois.some(
          (poi) => poi.type.toLowerCase() === poiType.toLowerCase(),
        ),
      )
      .map((floor) => floor.number)
      .sort((a, b) => a - b);
  }, [floors, poiType]);

  return (
    <BottomSheet
      handleComponent={null}
      index={0}
      snapPoints={snapPoints}
      onChange={() => {}}
      enablePanDownToClose={false}
      enableContentPanningGesture
      enableDynamicSizing={false}
      detached
      backgroundStyle={BottomSheetStyles.bottomSheet}
      containerStyle={{ overflow: "visible" }}
    >
      <View style={BottomSheetStyles.fakeHandleContainer}>
        <View style={BottomSheetStyles.fakeHandleBar} />
      </View>

      <View style={styles.header}>
        <Text style={styles.title}>{poiLabel}</Text>
        <Pressable onPress={onClose} style={BottomSheetStyles.closeIcon}>
          <CloseIcon size={28} />
        </Pressable>
      </View>

      <FloorFilterChips
        availableFloors={availableFloors}
        selectedFloor={selectedFloorFilter}
        onSelectFloor={setSelectedFloorFilter}
      />

      <BottomSheetScrollView contentContainerStyle={styles.scrollContent}>
        {sections.map((section) => (
          <PoiListSection
            key={section.title}
            title={section.title}
            items={section.data}
            poiType={poiType}
            buildingCode={buildingCode}
            onPoiSelect={onPoiSelect}
          />
        ))}
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
