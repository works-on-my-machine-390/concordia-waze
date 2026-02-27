import { Text, View } from "react-native";
import { BottomSheetStyles } from "./BuildingBottomSheet";

type BottomSheetListSectionProps = {
    title: string;
    items: string[];
}

export default function ListSection(props: Readonly<BottomSheetListSectionProps>) {
  return (
    <View style={BottomSheetStyles.listContainer}>
      <Text style={BottomSheetStyles.listTitle}>{props.title}</Text>
      {props.items.map((item) => (
        <Text key={item} style={BottomSheetStyles.listItem}>
          {item}
        </Text>
      ))}
    </View>
  );
}