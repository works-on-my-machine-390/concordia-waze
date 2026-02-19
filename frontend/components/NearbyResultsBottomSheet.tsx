import { Ionicons } from "@expo/vector-icons";
import React, { useMemo } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { colors, SHADOW } from "~/app/styles/theme";
import type { Poi } from "~/app/utils/poi";

type Props = {
  visible: boolean;
  loading: boolean;

  // map.tsx computes poisWithDistance; allow an optional distance on each item
  pois: Array<Poi & { distanceM?: number }>;

  sortMode: "relevance" | "distance";
  radiusM: number;

  onClose: () => void;
  onChangeSort: (next: "relevance" | "distance") => void;
  onChangeRadius: (nextM: number) => void;
  onSelectPoi: (poi: Poi) => void;
};

const radiusLabel = (m: number) => {
  if (m >= 1000) return `Within ${m / 1000}km`;
  return `Within ${m}m`;
};

const formatDistance = (m?: number) => {
  if (m == null || Number.isNaN(m)) return null;

  if (m < 1000) return `${Math.round(m)} m`;

  const km = m / 1000;
  // 1 decimal under 10km, otherwise whole km
  return km < 10 ? `${km.toFixed(1)} km` : `${Math.round(km)} km`;
};

export default function NearbyResultsBottomSheet({
  visible,
  loading,
  pois,
  sortMode,
  radiusM,
  onClose,
  onChangeSort,
  onChangeRadius,
  onSelectPoi,
}: Props) {
  const radiusOptions = useMemo(() => [250, 500, 1000, 2000], []);

  if (!visible) return null;

  return (
    <View style={styles.sheet}>
      <View style={styles.grabber} />

      <View style={styles.headerRow}>
        <Text style={styles.title}>Nearby results</Text>
        <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={10}>
          <Ionicons name="close" size={22} color={colors.text} />
        </Pressable>
      </View>

      <View style={styles.chipsRow}>
        <Pressable
          style={styles.chip}
          onPress={() =>
            onChangeSort(sortMode === "relevance" ? "distance" : "relevance")
          }
        >
          <Ionicons name="chevron-down" size={16} color={colors.subText} />
          <Text style={styles.chipText}>
            {sortMode === "relevance" ? "Relevance" : "Distance"}
          </Text>
        </Pressable>

        <Pressable
          style={styles.chip}
          onPress={() => {
            const idx = radiusOptions.indexOf(radiusM);
            const next = radiusOptions[(idx + 1) % radiusOptions.length];
            onChangeRadius(next);
          }}
        >
          <Ionicons name="navigate" size={16} color={colors.subText} />
          <Text style={styles.chipText}>{radiusLabel(radiusM)}</Text>
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator />
        </View>
      ) : (
        <FlatList
          data={pois}
          keyExtractor={(item) => item.id}
          style={{ flexGrow: 0 }}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <Pressable style={styles.rowText} onPress={() => onSelectPoi(item)}>
                <Text style={styles.poiName} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={styles.poiMeta} numberOfLines={1}>
                  {item.category}
                </Text>
                {item.address ? (
                  <Text style={styles.poiAddr} numberOfLines={1}>
                    {item.address}
                  </Text>
                ) : null}
              </Pressable>

              <View style={styles.rightCol}>
                {formatDistance(item.distanceM) ? (
                  <Text style={styles.distanceText}>
                    {formatDistance(item.distanceM)}
                  </Text>
                ) : null}

                <Pressable
                  style={styles.actionBtn}
                  onPress={() => onSelectPoi(item)}
                >
                  <Ionicons name="location" size={18} color="white" />
                </Pressable>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No results</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: "absolute",
    left: 10,
    right: 10,
    bottom: 10,
    maxHeight: 330,
    borderRadius: 18,
    backgroundColor: "white",
    paddingTop: 8,
    ...SHADOW,
  },
  grabber: {
    alignSelf: "center",
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#D9D9D9",
    marginBottom: 8,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingBottom: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  chipsRow: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 14,
    paddingBottom: 10,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.surface,
    ...SHADOW,
  },
  chipText: {
    fontSize: 13,
    color: colors.text,
    fontWeight: "600",
  },
  loading: {
    paddingVertical: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  list: {
    paddingHorizontal: 14,
    paddingBottom: 12,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#EEE",
  },
  rowText: {
    flex: 1,
  },
  rightCol: {
    alignItems: "flex-end",
    justifyContent: "center",
    gap: 6,
  },
  poiName: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
  },
  poiMeta: {
    fontSize: 12,
    color: colors.subText,
    marginTop: 2,
  },
  poiAddr: {
    fontSize: 12,
    color: colors.subText,
    marginTop: 2,
  },
  distanceText: {
    fontSize: 12,
    color: colors.subText,
    fontWeight: "700",
  },
  actionBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: colors.maroon,
    alignItems: "center",
    justifyContent: "center",
    ...SHADOW,
  },
  empty: {
    paddingVertical: 22,
    alignItems: "center",
  },
  emptyText: {
    color: colors.subText,
  },
});
