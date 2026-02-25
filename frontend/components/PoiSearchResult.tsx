import { COLORS } from "@/app/constants";
import { GetDirectionsIcon } from "@/app/icons";
import { getSimplifiedAddress } from "@/app/utils/stringUtils";
import { PoiSearchResultModel } from "@/hooks/queries/poiQueries";
import { Text, TouchableOpacity, View } from "react-native";

export type PoiSearchResultProps = {
  result: PoiSearchResultModel;
  onPress: (result: PoiSearchResultModel) => void;
  onDirectionsPress: (result: PoiSearchResultModel) => void;
};

export default function PoiSearchResult(props: Readonly<PoiSearchResultProps>) {
  const simplifiedAddress = getSimplifiedAddress(props.result.address);

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
      <TouchableOpacity onPress={() => props.onPress(props.result)}>
        <View style={{ display: "flex", flexDirection: "column" }}>
          <Text style={{ fontSize: 16, fontWeight: "bold" }}>
            {props.result.name}
          </Text>
          <Text style={{ marginTop: 10 }}>{simplifiedAddress}</Text>
        </View>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => props.onDirectionsPress(props.result)}>
        <GetDirectionsIcon size={48} color={COLORS.conuRed} />
      </TouchableOpacity>
    </View>
  );
}
