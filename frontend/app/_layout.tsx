/* 
Navigation wrapper using Expo Router's Stack navigator that defines three routes (index, login, register) 
and a nested drawer navigator for the main map screen. 
It also sets up a QueryClientProvider for React Query and includes a ToastManager for displaying toast notifications.
*/
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import ToastManager from "toastify-react-native";

const queryClient = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: false, retry: false } },
});

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: "#f5f2f2" },
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="register" />

        <Stack.Screen name="(drawer)" options={{ headerShown: false }} />
      </Stack>
      <ToastManager position="bottom" />
    </QueryClientProvider>
  );
}
