import { useGetGreeting } from "@/hooks/queries/greetingQueries";
import { Text, View, Pressable } from "react-native";
import { useRouter } from "expo-router";

export default function Index() {
  const greetingsQuery = useGetGreeting();
  const router = useRouter();
  
  return (
   <View>
      <Pressable onPress={() => router.push("/map")}>
        {/* change once login screen is committed on dev branch */}
        <Text>Go to Map</Text>
      </Pressable>
    </View>
  );
}
