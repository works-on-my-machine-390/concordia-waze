import MapBottomSection from "@/components/MapBottomSection";
import PoiOutdoorMarkers from "@/components/poi/PoiOutdoorMarkers";
import ShuttleBusMarkers from "@/components/ShuttleBusMarkers";
import {
  CampusBuilding,
  CampusCode,
  useGetBuildingDetails,
  useGetBuildings,
} from "@/hooks/queries/buildingQueries";
import { TextSearchRankPreferenceType } from "@/hooks/queries/poiQueries";
import { MapMode, useMapStore } from "@/hooks/useMapStore";
import { useNavigationStore } from "@/hooks/useNavigationStore";
import * as Location from "expo-location";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import MapView, { Region } from "react-native-maps";
import { Toast } from "toastify-react-native";
import { isPointInPolygon } from "~/app/utils/pointInPolygon";
import CampusBuildingPolygons from "~/components/CampusBuildingPolygons";
import { MapHeader } from "~/components/MapHeader";
import { NavigationHeader } from "~/components/NavigationHeader";
import {
  CAMPUS_COORDS,
  DEFAULT_CAMERA_MOVE_DURATION_IN_MS,
  DEFAULT_MAP_DELTA,
} from "../constants";
import { getDistance } from "../utils/mapUtils";

export type MapQueryParamsModel = {
  selected?: string;
  campus?: string;
  editMode?: "start" | "end";
  camLat?: string; // latitude for the center of the map camera
  camLng?: string; // longitude for the center of the map camera
} & MapPOIQueryParamsModel;

export type MapPOIQueryParamsModel = {
  query?: string;
  poiLat?: string; // latitude for the center of the POI search
  poiLng?: string; // longitude for the center of the POI search
  rankPref?: TextSearchRankPreferenceType; // "DISTANCE" or "RELEVANCE"
};

export default function MainMap() {
  const router = useRouter();
  const params = useLocalSearchParams<MapQueryParamsModel>();
  const [campus, setCampus] = useState<CampusCode>(CampusCode.SGW);

  const [location, setLocation] = useState<Location.LocationObject | null>(
    null,
  );

  const mapState = useMapStore();
  const navigationState = useNavigationStore();

  const [buildingsByCampus, setBuildingsByCampus] = useState<
    Record<string, CampusBuilding[]>
  >({});
  const [cameraCenter, setCameraCenter] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  // queried, but not acccessed here. the data is cached for when the user begins navigation
  useGetBuildingDetails(mapState.currentBuildingCode || undefined);
  useGetBuildingDetails(navigationState.startLocation?.code || undefined);

  // may be the same as building details - but if the user manually selects
  // a different start building, then they will be different

  const buildingListQuery = useGetBuildings(campus);

  const moveCamera = (params: {
    latitude: number;
    longitude: number;
    delta?: number;
    duration?: number;
  }) => {
    setCameraCenter({
      latitude: params.latitude,
      longitude: params.longitude,
    });

    if (mapRef.current) {
      mapRef.current.animateToRegion(
        {
          latitude: params.latitude,
          longitude: params.longitude,
          latitudeDelta: params.delta || DEFAULT_MAP_DELTA,
          longitudeDelta: params.delta || DEFAULT_MAP_DELTA,
        },
        params.duration || DEFAULT_CAMERA_MOVE_DURATION_IN_MS,
      );
    }
  };

  useEffect(() => {
    if (buildingListQuery.data) {
      setBuildingsByCampus((prev) => ({
        ...prev,
        [buildingListQuery.data.campus]: buildingListQuery.data.buildings || [],
      }));
    }
  }, [buildingListQuery.data]);

  // Initialize building selection from search params, if present
  useEffect(() => {
    if (typeof params.selected === "string" && params.selected.length > 0) {
      mapState.setSelectedBuildingCode(params.selected);
      if (params.editMode) return;
      mapState.setCurrentMode(MapMode.BUILDING);
    }
  }, [params.selected]);

  useEffect(() => {
    if (params.query) {
      mapState.setCurrentMode(MapMode.POI);
      mapState.setSelectedBuildingCode(null);
    }
  }, [params.query]);

  // Initialize campus from navigation params, if present
  useEffect(() => {
    if (typeof params.campus === "string") {
      const normalized = params.campus.toUpperCase();
      if (normalized === CampusCode.SGW || normalized === CampusCode.LOY) {
        setCampus(normalized as CampusCode);

        // prioritize camLat and camLng if present, otherwise default to campus center
        let coords = CAMPUS_COORDS[normalized as CampusCode];

        if (
          params.camLat &&
          params.camLng &&
          !Number.isNaN(Number(params.camLat)) &&
          !Number.isNaN(Number(params.camLng))
        ) {
          coords = {
            latitude: Number(params.camLat),
            longitude: Number(params.camLng),
          };
        }

        moveCamera({
          latitude: coords.latitude,
          longitude: coords.longitude,
        });
      }
    }
  }, [params.campus]);

  const buildingsToRender = useMemo(() => {
    return buildingsByCampus[campus] || [];
  }, [campus, buildingsByCampus]);

  const mapStyle = [
    {
      featureType: "poi",
      elementType: "all",
      stylers: [{ visibility: "off" }],
    },
  ];
  const mapRef = useRef<MapView>(null);

  const initializeCameraCenterFromParams = () => {
    if (params.camLat && params.camLng) {
      const lat = Number.parseFloat(params.camLat);
      const lng = Number.parseFloat(params.camLng);
      if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
        setTimeout(() => {
          moveCamera({
            latitude: lat,
            longitude: lng,
            duration: 100,
          });
        }, 500);
      }
    } else {
      // default to campus center if no params, and set params to reflect that
      const coords = CAMPUS_COORDS[campus];
      router.setParams({
        camLat: String(coords.latitude),
        camLng: String(coords.longitude),
      });
      moveCamera({
        latitude: coords.latitude,
        longitude: coords.longitude,
      });
    }
  };

  useEffect(() => {
    initializeCameraCenterFromParams();

    let sub: Location.LocationSubscription | null = null;

    const startWatching = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          return;
        }

        sub = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 1000,
            distanceInterval: 1,
          },
          (loc) => {
            setLocation(loc);
            mapState.setUserLocation(loc);
          },
        );
      } catch (e) {
        console.error("Failed to watch location.", e);
      }
    };

    startWatching();

    return () => {
      sub?.remove();
    };
  }, []);

  useEffect(() => {
    if (!location?.coords) return;

    const point = {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    };

    let found: string | null = null;

    for (const b of Object.values(buildingsByCampus).flat()) {
      if (isPointInPolygon(point, b.polygon)) {
        found = b.code;
        break;
      }
    }

    mapState.setCurrentBuildingCode(found);
  }, [
    location?.coords?.latitude,
    location?.coords?.longitude,
    buildingsByCampus,
  ]);

  const goToMyLocation = async () => {
    try {
      let coords = location?.coords;
      if (!coords) {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          return;
        }
        const current = await Location.getCurrentPositionAsync({});
        setLocation(current);
        mapState.setUserLocation(current);
        coords = current.coords;
      }

      if (coords) {
        moveCamera({
          latitude: coords.latitude,
          longitude: coords.longitude,
        });
      }
    } catch (e) {
      console.error("Failed to get to your location.", e);
      Toast.error("Failed to get your location. Please try again.");
    }
  };

  const handleCampusChange = (nextCampus: CampusCode) => {
    setCampus(nextCampus);
    const coords = CAMPUS_COORDS[nextCampus];
    moveCamera({
      latitude: coords.latitude,
      longitude: coords.longitude,
    });
  };

  // Handle map region changes to auto-switch campus
  const handleRegionChangeComplete = (region: Region) => {
    const { latitude, longitude } = region;
    setCameraCenter({ latitude, longitude });

    router.setParams({
      query: params.query || "",
      camLat: String(latitude),
      camLng: String(longitude),
    });

    // Calculate distance to each campus
    const distanceToSGW = getDistance(
      { latitude, longitude },
      CAMPUS_COORDS[CampusCode.SGW],
    );
    const distanceToLOY = getDistance(
      { latitude, longitude },
      CAMPUS_COORDS[CampusCode.LOY],
    );

    // Determine which campus is closer
    const closestCampus =
      distanceToSGW < distanceToLOY ? CampusCode.SGW : CampusCode.LOY;

    // Update campus if different
    if (closestCampus !== campus) {
      setCampus(closestCampus);
    }
  };

  const handleStartLocationPress = () => {
    router.push({
      pathname: "/search",
      params: {
        campus,
        editMode: "start",
      },
    });
  };

  const handleEndLocationPress = () => {
    router.push({
      pathname: "/search",
      params: {
        campus,
        editMode: "end",
      },
    });
  };

  const handleSearchBarClear = () => {
    mapState.setCurrentMode(MapMode.NONE);
    router.setParams({
      query: "",
    });
  };

  return (
    <View style={styles.container}>
      <MapView
        customMapStyle={mapStyle}
        showsPointsOfInterest={false}
        ref={mapRef}
        showsMyLocationButton={false} // remove default google location button
        style={styles.map}
        showsUserLocation={true}
        initialRegion={{
          // coordinates for SGW campus (default)
          latitude: CAMPUS_COORDS[CampusCode.SGW].latitude,
          longitude: CAMPUS_COORDS[CampusCode.SGW].longitude,
          latitudeDelta: DEFAULT_MAP_DELTA,
          longitudeDelta: DEFAULT_MAP_DELTA,
        }}
        onRegionChangeComplete={handleRegionChangeComplete}
      >
        <CampusBuildingPolygons buildings={buildingsToRender} />
        {mapState.currentMode === MapMode.POI && <PoiOutdoorMarkers />}
        <ShuttleBusMarkers />
      </MapView>

      {mapState.currentMode === MapMode.NAVIGATION ? (
        <NavigationHeader
          onStartLocationPress={handleStartLocationPress}
          onEndLocationPress={handleEndLocationPress}
        />
      ) : (
        <MapHeader
          campus={campus}
          onCampusChange={handleCampusChange}
          searchText={params.query || ""}
          onSearchClear={handleSearchBarClear}
          onMenuPress={() => {}}
          camLat={String((cameraCenter || CAMPUS_COORDS[campus]).latitude)}
          camLng={String((cameraCenter || CAMPUS_COORDS[campus]).longitude)}
        />
      )}
      <MapBottomSection
        goToMyLocation={goToMyLocation}
        moveCamera={moveCamera}
        userLocation={location?.coords}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
});
