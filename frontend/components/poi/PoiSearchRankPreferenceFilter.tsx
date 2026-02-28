import { COLORS } from "@/app/constants";
import {
  POI_DEFAULT_RANK_PREFERENCE,
  TextSearchRankPreferenceType,
} from "@/hooks/queries/poiQueries";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { poiFilterStyles } from "@/app/styles/poi/poiStyle";
import { MapPOIQueryParamsModel } from "@/app/(drawer)/map";

type Props = {
  onChange: () => void;
};

// technically a sort but whatever
export default function PoiSearchRankPreferenceFilter(props: Readonly<Props>) {
  const params = useLocalSearchParams<MapPOIQueryParamsModel>(); // use params as source of truth
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!params.rankPref) {
      router.setParams({ rankPref: POI_DEFAULT_RANK_PREFERENCE });
    }
  }, [params.rankPref, router]);

  const displayText = params?.rankPref
    ?.toLowerCase()
    .replace(/^./, (char) => char.toUpperCase());

  const rankOptions = [
    TextSearchRankPreferenceType.RELEVANCE,
    TextSearchRankPreferenceType.DISTANCE,
  ];

  const handleSelectPreference = (preference: TextSearchRankPreferenceType) => {
    setIsOpen(false);
    if (preference === params.rankPref) {
      return;
    }
    router.setParams({ rankPref: preference });
    props.onChange();
  };

  return (
    <View style={{ zIndex: isOpen ? 100 : 1 }}>
      {isOpen && (
        <Pressable
          onPress={() => setIsOpen(false)}
          style={poiFilterStyles.backdrop}
        />
      )}

      <Pressable
        onPress={() => setIsOpen((previousValue) => !previousValue)}
        style={poiFilterStyles.filterChip}
      >
        <MaterialIcons name="sort" size={24} color="black" />
        <Text>{displayText}</Text>
      </Pressable>

      {isOpen && (
        <View style={poiFilterStyles.dropdownOptionsContainer}>
          {rankOptions.map((option) => {
            const optionDisplayText = option
              .toLowerCase()
              .replace(/^./, (char) => char.toUpperCase());

            return (
              <Pressable
                key={option}
                onPress={() => handleSelectPreference(option)}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  borderBottomWidth: option === rankOptions.at(-1) ? 0 : 1,
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
