import { COLORS } from "@/app/constants";
import { GetDirectionsIcon, MenuIcon } from "@/app/icons";
import { formatIndoorPoiName } from "@/app/utils/indoorNameFormattingUtils";
import SearchPill from "@/components/shared/SearchPill";
import type { BuildingListItem } from "@/hooks/queries/buildingQueries";
import { useGetAllBuildings } from "@/hooks/queries/buildingQueries";
import {
  type FavoriteLocation,
  useGetUserFavorites,
} from "@/hooks/queries/favoritesQueries";
import { useGetProfile } from "@/hooks/queries/userQueries";
import { MapMode, useMapStore } from "@/hooks/useMapStore";
import {
  IndoorNavigableLocation,
  NavigableLocation,
  NavigationPhase,
  OutdoorNavigableLocation,
  useNavigationStore,
} from "@/hooks/useNavigationStore";
import useStartLocation from "@/hooks/useStartLocation";
import { DrawerActions, useNavigation } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const DEFAULT_GUEST_USER_ID = "guest";

export default function Favorites() {
  // for directions
  const navigationState = useNavigationStore();
  const mapState = useMapStore();
  const { findAndSetStartLocation } = useStartLocation();

  const nav = useNavigation();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");

  const profileQuery = useGetProfile();
  const userId = profileQuery.data?.id || DEFAULT_GUEST_USER_ID;

  const favoritesQuery = useGetUserFavorites(userId, true);
  const allBuildingsQuery = useGetAllBuildings();

  const buildingByCode = useMemo(() => {
    const map = new Map<string, BuildingListItem>();
    const sgwBuildings = allBuildingsQuery.data?.buildings.SGW || [];
    const loyBuildings = allBuildingsQuery.data?.buildings.LOY || [];

    for (const building of [...sgwBuildings, ...loyBuildings]) {
      map.set(building.code, building);
    }

    return map;
  }, [allBuildingsQuery.data]);

  const resolveBuildingForFavorite = (favorite: FavoriteLocation) => {
    if (favorite.buildingCode) {
      return buildingByCode.get(favorite.buildingCode);
    }

    const favoritesName = favorite.name.trim().toLowerCase();

    for (const building of buildingByCode.values()) {
      const matchesName =
        building.long_name.trim().toLowerCase() === favoritesName;
      const matchesCoords =
        typeof favorite.latitude === "number" &&
        typeof favorite.longitude === "number" &&
        building.latitude === favorite.latitude &&
        building.longitude === favorite.longitude;

      if (matchesName || matchesCoords) {
        return building;
      }
    }

    return undefined;
  };

  const getSubtitle = (favorite: FavoriteLocation) => {
    if (favorite.type === "indoor" && favorite.buildingCode) {
      const floorText =
        typeof favorite.floorNumber === "number"
          ? ` - Floor ${favorite.floorNumber}`
          : "";

      return `${favorite.buildingCode}${floorText}`;
    }

    if (favorite.type === "outdoor") {
      const relatedBuilding = resolveBuildingForFavorite(favorite);

      if (relatedBuilding) {
        return `Concordia Building - ${relatedBuilding.code}`;
      }
    }

    return "Saved location";
  };

  const filteredFavorites = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    const favorites = favoritesQuery.data || [];

    if (!query) {
      return favorites;
    }

    return favorites.filter((favorite) => {
      const relatedBuilding = favorite.buildingCode
        ? buildingByCode.get(favorite.buildingCode)
        : undefined;

      const searchableText = [
        favorite.name,
        favorite.buildingCode || "",
        favorite.poiType || "",
        relatedBuilding?.long_name || "",
        getSubtitle(favorite),
      ]
        .join(" ")
        .toLowerCase();

      return searchableText.includes(query);
    });
  }, [buildingByCode, favoritesQuery.data, searchQuery]);

  const getDisplayTitle = (favorite: FavoriteLocation) => {
    if (favorite.type === "indoor" && favorite.buildingCode) {
      return formatIndoorPoiName(
        favorite.name,
        favorite.poiType || "",
        favorite.buildingCode,
      );
    }

    return favorite.name;
  };

  const handleFavoritePress = (favorite: FavoriteLocation) => {
    const relatedBuilding = resolveBuildingForFavorite(favorite);
    let camLat: string | undefined;
    let camLng: string | undefined;

    if (typeof favorite.latitude === "number") {
      camLat = String(favorite.latitude);
    } else if (typeof relatedBuilding?.latitude === "number") {
      camLat = String(relatedBuilding.latitude);
    }

    if (typeof favorite.longitude === "number") {
      camLng = String(favorite.longitude);
    } else if (typeof relatedBuilding?.longitude === "number") {
      camLng = String(relatedBuilding.longitude);
    }

    if (favorite.type === "indoor" && favorite.buildingCode) {
      router.push({
        pathname: "/indoor-map",
        params: {
          buildingCode: favorite.buildingCode,
          selectedPoiName: favorite.name,
          selectedFloor:
            typeof favorite.floorNumber === "number"
              ? String(favorite.floorNumber)
              : undefined,
        },
      });
      return;
    }

    router.push({
      pathname: "/map",
      params: {
        selected: relatedBuilding?.code,
        campus: relatedBuilding?.campus,
        camLat,
        camLng,
      },
    });
  };

  const handleDirectionsPress = (favorite: FavoriteLocation) => {
    let endLocation: NavigableLocation;
    let pathname: "/map" | "/indoor-map";
    let params: Record<string, string | undefined>;

    if (favorite.type === "indoor" && favorite.buildingCode) {
      // we need to get the latitude and longitude for indoor favorites

      const building = buildingByCode.get(favorite.buildingCode);
      const latitude = building?.latitude;
      const longitude = building?.longitude;

      endLocation = {
        latitude: latitude,
        longitude: longitude,
        name: favorite.name,
        code: favorite.buildingCode,
        building: favorite.buildingCode,
        floor_number: favorite.floorNumber,
        indoor_position: {
          x: favorite.x,
          y: favorite.y,
        },
      } as IndoorNavigableLocation;

      pathname = "/indoor-map";
      params = {
        buildingCode: favorite.buildingCode,
        selectedPoiName: favorite.name,
        selectedFloor:
          typeof favorite.floorNumber === "number"
            ? String(favorite.floorNumber)
            : undefined,
      };
    } else if (favorite.type === "outdoor") {
      endLocation = {
        latitude: favorite.latitude,
        longitude: favorite.longitude,
        name: favorite.name,
        code: favorite.buildingCode,
      } as OutdoorNavigableLocation;

      pathname = "/map";
      params = {
        selected: favorite.buildingCode,
      }
    }

    router.push({ pathname, params });

    navigationState.setEndLocation(endLocation);
    findAndSetStartLocation(endLocation);
    mapState.setCurrentMode(MapMode.NAVIGATION);
    navigationState.setNavigationPhase(NavigationPhase.PREPARATION);
  };

  const renderFavoriteItem = ({ item }: { item: FavoriteLocation }) => (
    <Pressable
      style={({ pressed }) => [
        styles.favoriteRow,
        pressed && styles.favoriteRowPressed,
      ]}
      onPress={() => handleFavoritePress(item)}
      accessibilityRole="button"
      accessibilityLabel={`Open ${getDisplayTitle(item)}`}
    >
      <View style={styles.favoriteTextBlock}>
        <Text style={styles.favoriteTitle} numberOfLines={1}>
          {getDisplayTitle(item)}
        </Text>
        <Text style={styles.favoriteSubtitle} numberOfLines={1}>
          {getSubtitle(item)}
        </Text>
      </View>

      <Pressable
        style={({ pressed }) => [
          styles.directionsButton,
          pressed && styles.iconButtonPressed,
        ]}
        onPress={() => handleDirectionsPress(item)}
        accessibilityRole="button"
        accessibilityLabel={`Get directions to ${item.name}`}
      >
        <GetDirectionsIcon size={21} color="#fff" />
      </Pressable>
    </Pressable>
  );

  const isLoading = favoritesQuery.isLoading || profileQuery.isLoading;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topRow}>
        <MenuIcon
          size={24}
          color={COLORS.maroon}
          onPress={() => nav.dispatch(DrawerActions.openDrawer())}
          testID="favorites-menu-button"
        />
        <View style={styles.searchWrap}>
          <SearchPill
            value={searchQuery}
            placeholder="Search favorites"
            editable
            onChangeText={setSearchQuery}
            onClear={() => setSearchQuery("")}
          />
        </View>
      </View>

      {isLoading && (
        <View style={styles.stateContainer}>
          <ActivityIndicator size="large" color={COLORS.maroon} />
          <Text style={styles.stateText}>Loading favorites...</Text>
        </View>
      )}

      {!isLoading && favoritesQuery.error && (
        <View style={styles.stateContainer}>
          <Text style={styles.errorText}>
            Could not load favorites. Please try again later.
          </Text>
        </View>
      )}

      {!isLoading && !favoritesQuery.error && (
        <FlatList
          data={filteredFavorites}
          renderItem={renderFavoriteItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <View style={styles.stateContainer}>
              <Text style={styles.stateText}>No favorites found.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f4f4f4",
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingTop: 6,
    paddingBottom: 8,
  },
  searchWrap: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 14,
    paddingTop: 6,
    paddingBottom: 24,
  },
  favoriteRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 4,
    paddingVertical: 14,
  },
  favoriteRowPressed: {
    opacity: 0.92,
  },
  favoriteTextBlock: {
    flex: 1,
    marginRight: 10,
  },
  favoriteTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  favoriteSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  directionsButton: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: COLORS.maroon,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  iconButtonPressed: {
    transform: [{ scale: 0.96 }],
    opacity: 0.9,
  },
  stateContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
    paddingTop: 36,
  },
  stateText: {
    marginTop: 10,
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  errorText: {
    color: COLORS.error,
    fontSize: 14,
    textAlign: "center",
  },
});
