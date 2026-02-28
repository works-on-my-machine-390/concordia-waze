import { MapSettingsList } from "@/hooks/useMapSettings";
import { Switch, Text, View } from "react-native";
import { ListSectionStyles } from "./BottomSheetListSection";

type SettingListItemProps = {
  settingKey: string;
  value: any;
  onChange?: (newValue: any) => void;
};
export default function SettingListItem(props: Readonly<SettingListItemProps>) {
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
            value={!!props.value}
            onValueChange={(newValue) => props.onChange?.(newValue)}
          />
        )}
      </View>
    </View>
  );
}
