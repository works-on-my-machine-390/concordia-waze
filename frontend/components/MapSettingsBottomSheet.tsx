import BottomSheet, { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { useMemo, useRef } from "react";
import { Switch, Text, View } from "react-native";
import { BuildingBottomSheetStyles } from "./BuildingBottomSheet";
import BottomSheetListSection, {
  ListSectionStyles,
} from "./BottomSheetListSection";
import useMapSettings, { MapSettingsList } from "@/hooks/useMapSettings";

type MapSettingsBottomSheetProps = {
  onClose?: () => void;
};

export default function MapSettingsBottomSheet(
  props: Readonly<MapSettingsBottomSheetProps>,
) {
  const bottomSheetRef = useRef<BottomSheet>(null);

  const snapPoints = ["20%", "70%"];

  const { mapSettings, updateSetting } = useMapSettings();

  return (
    <BottomSheet
      handleComponent={null}
      ref={bottomSheetRef}
      index={0}
      snapPoints={snapPoints}
      enablePanDownToClose
      onClose={props.onClose}
      enableContentPanningGesture
      enableDynamicSizing={false}
      detached
      backgroundStyle={BuildingBottomSheetStyles.bottomSheet}
      containerStyle={{ overflow: "visible" }}
    >
      <View style={BuildingBottomSheetStyles.fakeHandleContainer}>
        <View style={BuildingBottomSheetStyles.fakeHandleBar} />
      </View>

      <View style={BuildingBottomSheetStyles.headerContainer}>
        <View style={BuildingBottomSheetStyles.textContainer}>
          <Text style={BuildingBottomSheetStyles.name}>Map Settings</Text>
        </View>
      </View>

      <BottomSheetScrollView style={BuildingBottomSheetStyles.scrollContent}>
        {Object.entries(mapSettings).map(([key, value]) => (
          <SettingListItem
            settingKey={key}
            value={value}
            onChange={(newValue) => updateSetting(key, newValue)}
            key={key}
          />
        ))}
      </BottomSheetScrollView>
    </BottomSheet>
  );
}

type SettingListItemProps = {
  settingKey: string;
  value: any;
  onChange?: (newValue: any) => void;
};
export function SettingListItem(props: SettingListItemProps) {
  const settingInfo = MapSettingsList.find(
    (setting) => setting.key === props.settingKey,
  );
  if (!settingInfo) {
    return null;
  }

  return (
    <View
      style={[
        ListSectionStyles.listContainer,
        {
          flexDirection: "row",
          alignItems: "flex-start",
          justifyContent: "space-between",
          width: "100%",
        },
      ]}
      key={props.settingKey}
    >
      <View style={{ maxWidth: "80%" }}>
        <Text style={ListSectionStyles.listTitle}>{settingInfo.label}</Text>
        <Text style={ListSectionStyles.listItem}>
          {settingInfo.description}
        </Text>
      </View>
      <View>
        {settingInfo.controlType === "switch" && (
          <Switch
            value={props.value ? true : false}
            onValueChange={(newValue) => props.onChange?.(newValue)}
          />
        )}
      </View>
    </View>
  );
}
