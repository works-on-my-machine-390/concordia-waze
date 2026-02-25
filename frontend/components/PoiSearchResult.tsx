import { PoiSearchResultModel } from "@/hooks/queries/poiQueries";
import { Text, View } from "react-native";

export type PoiSearchResultProps = {
  result: PoiSearchResultModel;
};

//TODO: style according to mockup
export default function PoiSearchResult(props: Readonly<PoiSearchResultProps>) {
  return (
    <View style={{ padding: 20 }}>
      <Text style={{ fontSize: 18, fontWeight: "bold" }}>
        {props.result.name}
      </Text>
      <Text style={{ marginTop: 10 }}>{props.result.address}</Text>
    </View>
  );
}
