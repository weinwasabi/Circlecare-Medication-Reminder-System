import { Redirect, Stack } from "expo-router";
import { useAuthStore } from "../../store/authStore";

export default function AuthLayout() {
  const isLoading = useAuthStore((state) => state.isLoading);
  const user = useAuthStore((state) => state.user);

  if (!isLoading && user?.role === "admin") {
    return <Redirect href="/(admin)" />;
  }

  if (!isLoading && user?.role === "nurse") {
    return <Redirect href="/(nurse)" />;
  }

  if (!isLoading && user?.role === "patient") {
    return <Redirect href="/(patient)" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
