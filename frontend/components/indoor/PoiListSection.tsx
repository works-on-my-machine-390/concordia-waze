import { COLORS } from "@/app/constants";
import { formatIndoorPoiName } from "@/app/utils/indoorNameFormattingUtils";
import { Pressable, StyleSheet, Text, View } from "react-native";

type PoiItem = {
  name: string;
  floor: number;
};

type Props = {
  title: string;
  items: PoiItem[];
  poiType: string;
  buildingCode: string;
  onPoiSelect: (roomCode: string, floorNumber: number) => void;
};

export default function PoiListSection({
  title,
  items,
  poiType,
  buildingCode,
  onPoiSelect,
}: Readonly<Props>) {
  return (
    <View>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>

      {items.map((item, index) => {
        const displayName = formatIndoorPoiName(
          item.name,
          poiType,
          buildingCode,
        );

        return (
          <Pressable
            key={`${item.name}-${item.floor}-${index}`}
            style={styles.poiItem}
            onPress={() => onPoiSelect(item.name, item.floor)}
          >
            <Text style={styles.poiName}>{displayName}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  sectionHeader: {
    paddingVertical: 8,
    paddingTop: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.textSecondary,
    textTransform: "uppercase",
  },
  poiItem: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: "white",
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#E5E5E5",
  },
  poiName: {
    fontSize: 15,
    fontWeight: "500",
    color: COLORS.textPrimary,
  },
});
