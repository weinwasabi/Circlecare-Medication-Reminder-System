import "../global.css";
import React, { useEffect } from "react";
import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_700Bold,
} from "@expo-google-fonts/dm-sans";
import { Slot } from "expo-router";
import { useFonts } from "expo-font";
import { ActivityIndicator, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { getDatabase } from "../db/database";
import { useAuthStore } from "../store/authStore";

function AppBootstrap() {
  const isLoading = useAuthStore((state) => state.isLoading);
  const setLoading = useAuthStore((state) => state.setLoading);
  const [fontsLoaded] = useFonts({
    "DMSans-Regular": DMSans_400Regular,
    "DMSans-Medium": DMSans_500Medium,
    "DMSans-Bold": DMSans_700Bold,
  });

  useEffect(() => {
    let active = true;

    setLoading(true);
    getDatabase().finally(() => {
      if (active) {
        setLoading(false);
      }
    });

    return () => {
      active = false;
    };
  }, [setLoading]);

  return (
    <View className="flex-1">
      <Slot />
      {!fontsLoaded || isLoading ? (
        <View className="absolute inset-0 items-center justify-center bg-surface">
          <ActivityIndicator size="large" color="#44604f" />
        </View>
      ) : null}
    </View>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AppBootstrap />
    </SafeAreaProvider>
  );
}
