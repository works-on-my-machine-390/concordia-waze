import useMapSettings, { MapSettings } from "@/hooks/useMapSettings";
import { useMapStore } from "@/hooks/useMapStore";
import BottomSheet, { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { useCallback, useRef } from "react";
import { Text, View } from "react-native";
import { BottomSheetStyles } from "./BuildingBottomSheet";
import SettingListItem from "./MapSettingsListItem";

export type MapSettingsBottomSheetProps = {
  onSheetIndexChange?: (index: number) => void;
};

export default function MapSettingsBottomSheet(
  props: Readonly<MapSettingsBottomSheetProps>,
) {
  const { closeSheet } = useMapStore();
  const bottomSheetRef = useRef<BottomSheet>(null);

  const snapPoints = ["40%", "70%"];

  const { mapSettings, updateSetting } = useMapSettings();

  const handleSheetChanges = useCallback((index: number) => {
    props.onSheetIndexChange?.(index);
  }, [props.onSheetIndexChange]);

  return (
    <BottomSheet
      handleComponent={null}
      ref={bottomSheetRef}
      index={0}
      snapPoints={snapPoints}
      enablePanDownToClose
      onClose={closeSheet}
      onChange={handleSheetChanges}
      enableContentPanningGesture
      enableDynamicSizing={false}
      detached
      backgroundStyle={BottomSheetStyles.bottomSheet}
      containerStyle={{ overflow: "visible" }}
    >
      <View style={BottomSheetStyles.fakeHandleContainer}>
        <View style={BottomSheetStyles.fakeHandleBar} />
      </View>

      <View style={BottomSheetStyles.headerContainer}>
        <View style={BottomSheetStyles.textContainer}>
          <Text style={BottomSheetStyles.name}>Map Settings</Text>
        </View>
      </View>

      <BottomSheetScrollView style={BottomSheetStyles.scrollContent}>
        {Object.entries(mapSettings).map(([key, value]) => (
          <SettingListItem
            settingKey={key}
            value={value}
            onChange={(newValue) =>
              updateSetting(key as keyof MapSettings, newValue)
            }
            key={key}
          />
        ))}
      </BottomSheetScrollView>
    </BottomSheet>
  );
}
