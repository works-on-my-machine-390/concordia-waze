import { COLORS } from "@/app/constants";
import { navigationHeaderStyles } from "@/app/styles/navigationHeaderStyles";
import { useNavigationStore } from "@/hooks/useNavigationStore";
import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// TODO add details
export default function ActiveNavigationHeader() {
  const navigationState = useNavigationStore();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        navigationHeaderStyles.container,
        {
          paddingTop: insets.top,
          justifyContent: "center",
          alignItems: "center",
        },
      ]}
    >
      <View style={[{padding: 24, backgroundColor: COLORS.background,elevation: 3, borderRadius: 12}]}>
        <Text>Navigation in progress</Text>
      </View>
    </View>
  );
}
