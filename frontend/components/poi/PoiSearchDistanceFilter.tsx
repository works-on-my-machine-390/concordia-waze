import { MapPOIQueryParamsModel } from "@/app/(drawer)/map";
import { COLORS } from "@/app/constants";
import { poiFilterStyles } from "@/app/styles/poi/poiStyle";
import {
  DistanceFilterReferenceOptions,
  POI_DEFAULT_DISTANCE_FILTER_REFERENCE,
  POI_DEFAULT_MAX_DISTANCE_IN_M,
} from "@/hooks/queries/poiQueries";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";

export default function PoiSearchDistanceFilter() {
  const params = useLocalSearchParams<MapPOIQueryParamsModel>(); // use params as source of truth
  const router = useRouter();
  const [isDistOpen, setIsDistOpen] = useState<boolean>(false);
  const [isRefOpen, setIsRefOpen] = useState<boolean>(false);

  useEffect(() => {
    if (!params.maxDist) {
      router.setParams({ maxDist: POI_DEFAULT_MAX_DISTANCE_IN_M });
    }

    if (!params.distFilterReference) {
      router.setParams({
        distFilterReference: POI_DEFAULT_DISTANCE_FILTER_REFERENCE,
      });
    }
  }, [params.maxDist, params.distFilterReference, router]);

  const displayDistanceText = (params?: MapPOIQueryParamsModel) => {
    let dist =
      params?.maxDist && Number.isInteger(Number.parseInt(params.maxDist))
        ? Number.parseInt(params.maxDist)
        : POI_DEFAULT_MAX_DISTANCE_IN_M;

    if (dist === 0) {
      return "Any Distance";
    }

    if (dist % 1000 !== 0) {
      return `Within ${dist}m`;
    }

    return `Within ${dist / 1000}km`;
  };

  const displayReferenceText = (params?: MapPOIQueryParamsModel) => {
    let reference = params?.distFilterReference;

    if (
      !reference ||
      !Object.values(DistanceFilterReferenceOptions).includes(reference)
    ) {
      reference = POI_DEFAULT_DISTANCE_FILTER_REFERENCE;
    }
    return getReferenceOptionLabel(reference);
  };

  const getDistanceOptionLabel = (option: number) => {
    if (option === 0) {
      return "Any Distance";
    }
    if (option % 1000 !== 0) {
      return `${option}m`;
    }
    return `${option / 1000}km`;
  };

  const getReferenceOptionLabel = (option: DistanceFilterReferenceOptions) => {
    switch (option) {
      case DistanceFilterReferenceOptions.CAMERA:
        return "From map center";
      case DistanceFilterReferenceOptions.USER:
        return "From user location";
    }
  };

  const maxDistanceOptions = [0, 250, 500, 1000, 2000];

  const handleSelectMaxDistance = (maxDistance: number) => {
    router.setParams({ maxDist: maxDistance });
    setIsDistOpen(false);
  };

  const handleSelectReference = (reference: DistanceFilterReferenceOptions) => {
    router.setParams({ distFilterReference: reference });
    setIsRefOpen(false);
  };

  return (
    <View style={{ zIndex: isDistOpen || isRefOpen ? 100 : 1 }}>
      {(isDistOpen || isRefOpen) && (
        <Pressable
          onPress={() => {
            setIsDistOpen(false);
            setIsRefOpen(false);
          }}
          style={poiFilterStyles.backdrop}
        />
      )}
      <View style={poiFilterStyles.filterChip}>
        <Pressable
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
          }}
          onPress={() => {
            setIsDistOpen((previousValue) => !previousValue);
            setIsRefOpen(false);
          }}
        >
          <MaterialCommunityIcons
            name="map-marker-distance"
            size={24}
            color="black"
          />
          <Text>{displayDistanceText(params)}</Text>
        </Pressable>
        <View
          style={{
            width: 1,
            height: "100%",
            backgroundColor: COLORS.textMuted,
          }}
        />
        <Pressable
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
          }}
          onPress={() => {
            setIsRefOpen((previousValue) => !previousValue);
            setIsDistOpen(false);
          }}
        >
          <Text>{displayReferenceText(params)}</Text>
        </Pressable>
      </View>
      {isDistOpen && (
        <View style={poiFilterStyles.dropdownOptionsContainer}>
          {maxDistanceOptions.map((option) => {
            const optionDisplayText = getDistanceOptionLabel(option);

            return (
              <Pressable
                key={option}
                onPress={() => handleSelectMaxDistance(option)}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  borderBottomWidth:
                    option === maxDistanceOptions.at(-1) ? 0 : 1,
                  borderBottomColor: COLORS.border,
                }}
              >
                <Text>{optionDisplayText}</Text>
              </Pressable>
            );
          })}
        </View>
      )}
      {isRefOpen && (
        <View style={poiFilterStyles.dropdownOptionsContainer}>
          {Object.values(DistanceFilterReferenceOptions).map((option) => {
            const optionDisplayText = getReferenceOptionLabel(option);

            return (
              <Pressable
                key={option}
                onPress={() => handleSelectReference(option)}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  borderBottomWidth:
                    option ===
                    Object.values(DistanceFilterReferenceOptions).at(-1)
                      ? 0
                      : 1,
                  borderBottomColor: COLORS.border,
                }}
              >
                <Text>{optionDisplayText}</Text>
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}
