import { COLORS } from "@/app/constants";
import { GetDirectionsIcon } from "@/app/icons";
import { getDistanceDisplayText, getSimplifiedAddress } from "@/app/utils/stringUtils";
import { PoiSearchResultModel } from "@/hooks/queries/poiQueries";
import { Text, TouchableOpacity, View } from "react-native";
import { ExtendedPoiSearchResultModel } from "./PoiSearchBottomSheet";
import { poiListStyles } from "@/app/styles/poi/poiStyle";

export type PoiSearchResultProps = {
  isDistanceAvailable?: boolean;
  result: ExtendedPoiSearchResultModel;
  onPress: (result: PoiSearchResultModel) => void;
  onDirectionsPress: (result: PoiSearchResultModel) => void;
};

export default function PoiSearchResult(props: Readonly<PoiSearchResultProps>) {
  const simplifiedAddress = getSimplifiedAddress(props.result.address);
  const distance = props.isDistanceAvailable
    ? getDistanceDisplayText(props.result.distanceFromUserInMeters)
    : "";

  return (
    <View
      style={poiListStyles.itemContainer}
    >
      <TouchableOpacity
        style={{ width: "80%" }}
        onPress={() => props.onPress(props.result)}
      >
        <View style={{ display: "flex", flexDirection: "column" }}>
          <Text
            style={{ fontSize: 16, fontWeight: "bold", maxWidth: "100%" }}
            ellipsizeMode="tail"
            numberOfLines={2}
          >
            {props.result.name}
          </Text>
          <Text style={{ marginTop: 10 }}>{simplifiedAddress}</Text>
        </View>
      </TouchableOpacity>
      <View
        style={{
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Text style={{ textAlign: "center", fontSize: 12 }}>{distance}</Text>
        <TouchableOpacity onPress={() => props.onDirectionsPress(props.result)}>
          <GetDirectionsIcon size={48} color={COLORS.conuRed} />
        </TouchableOpacity>
      </View>
    </View>
  );
}
