import { COLORS } from "@/app/constants";
import { GetDirectionsIcon } from "@/app/icons";
import { getSimplifiedAddress } from "@/app/utils/stringUtils";
import { PoiSearchResultModel } from "@/hooks/queries/poiQueries";
import { Text, TouchableOpacity, View } from "react-native";
import { ExtendedPoiSearchResultModel } from "./PoiSearchBottomSheet";

export type PoiSearchResultProps = {
  isDistanceAvailable?: boolean;
  result: ExtendedPoiSearchResultModel;
  onPress: (result: PoiSearchResultModel) => void;
  onDirectionsPress: (result: PoiSearchResultModel) => void;
};

export default function PoiSearchResult(props: Readonly<PoiSearchResultProps>) {
  const simplifiedAddress = getSimplifiedAddress(props.result.address);
  const distance =
    props.isDistanceAvailable &&
    props.result.distanceFromUser > 0 &&
    (props.result.distanceFromUser < 1
      ? `${(props.result.distanceFromUser * 1000).toFixed(0)} m`
      : `${props.result.distanceFromUser.toFixed(2)} km`);

  return (
    <View
      style={{
        paddingTop: 8,
        paddingBottom: 16,
        display: "flex",
        marginTop: 8,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        borderBottomColor: COLORS.border,
        borderBottomWidth: 1,
      }}
    >
      <TouchableOpacity style={{width: "80%"}} onPress={() => props.onPress(props.result)}>
        <View style={{ display: "flex", flexDirection: "column" }}>
          <Text style={{ fontSize: 16, fontWeight: "bold", maxWidth: "100%" }} ellipsizeMode="tail" numberOfLines={2}>
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
        <Text style={{ textAlign: "center" , fontSize: 12}}>{distance}</Text>
        <TouchableOpacity onPress={() => props.onDirectionsPress(props.result)}>
          <GetDirectionsIcon size={48} color={COLORS.conuRed} />
        </TouchableOpacity>
      </View>
    </View>
  );
}
