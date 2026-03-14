/* 
Navigation wrapper using Expo Router's Stack navigator that defines three routes (index, login, register) 
and a nested drawer navigator for the main map screen. 
It also sets up a QueryClientProvider for React Query and includes a ToastManager for displaying toast notifications.
*/
/* 
Navigation wrapper using Expo Router's Stack navigator that defines three routes (index, login, register) 
*/
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useSegments } from "expo-router";
import { useEffect, useMemo } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import ToastManager from "toastify-react-native";

import { initTelemetry, trackScreen } from "@/lib/telemetry";

const queryClient = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: false, retry: false } },
});

export default function RootLayout() {
  const segments = useSegments();

  const currentScreen = useMemo(() => {
    const route = segments
      .filter((segment) => !segment.startsWith("("))
      .join("/");
    return route || "index";
  }, [segments]);

  useEffect(() => {
    void initTelemetry();
  }, []);

  useEffect(() => {
    void trackScreen(currentScreen);
  }, [currentScreen]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
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
    </GestureHandlerRootView>
  );
}
