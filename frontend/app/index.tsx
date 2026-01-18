import { useGetGreeting } from "@/hooks/queries/greetingQueries";
import { Text, View } from "react-native";

export default function Index() {
  const greetingsQuery = useGetGreeting();
  
  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      {greetingsQuery.isLoading ? (
        <Text>Loading...</Text>
      ) : greetingsQuery.isError ? (
        <Text>Error loading greeting. API may be down.</Text>
      ) : (
        <Text>{greetingsQuery.data?.message}</Text>
      )}
    </View>
  );
}
