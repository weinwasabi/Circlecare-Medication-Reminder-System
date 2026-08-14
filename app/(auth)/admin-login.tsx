import React, { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Button } from "../../components/ui/Button";
import { loginAdmin} from "../../db/queries/nurses";
import { useAuthStore } from "../../store/authStore";

export default function AdminLoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);

  async function handleLogin() {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Required", "Please fill in all fields.");
      return;
    }
    setLoading(true);
    try {
      const admin = await loginAdmin(email.trim(), password.trim());
      if (!admin) {
        Alert.alert("Login Failed", "Invalid email or password.");
        return;
      }
      setUser({ id: admin.id, fname: admin.fname, lname: admin.lname, email: admin.email, role: "admin" });
    } catch {
      Alert.alert("Error", "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-surface">
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1">
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
          <View className="flex-1 px-6 pt-12 pb-8">
            <TouchableOpacity onPress={() => router.back()} className="mb-10 self-start flex-row items-center">
              <Ionicons name="arrow-back" size={20} color="#277859" />
              <Text className="font-menu text-sm text-primary-600 ml-1">Back</Text>
            </TouchableOpacity>

            <View className="mb-8">
              <View className="w-12 h-12 rounded-2xl bg-primary-100 items-center justify-center mb-4">
                <Ionicons name="medical-outline" size={24} color="#277859" />
              </View>
              <Text className="font-heading text-3xl text-ink">Admin Portal</Text>
              <Text className="font-sans text-sm text-muted mt-1">Sign in with your credentials</Text>
            </View>

            <View className="gap-3 mb-6">
              <View>
                <Text className="font-menu text-xs text-muted mb-1.5">Email</Text>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="admin@circlecare.app"
                  placeholderTextColor="#9ca3af"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  className="bg-card border border-border rounded-xl px-4 py-3.5 text-sm text-ink"
                />
              </View>
              <View>
                <Text className="font-menu text-xs text-muted mb-1.5">Password</Text>
                <View className="flex-row items-center bg-card border border-border rounded-xl px-4">
                  <TextInput
                    value={password}
                    onChangeText={setPassword}
                    placeholder="••••••••"
                    placeholderTextColor="#9ca3af"
                    secureTextEntry={!showPass}
                    className="flex-1 py-3.5 text-sm text-ink"
                  />
                  <TouchableOpacity onPress={() => setShowPass((v) => !v)}>
                    <Ionicons name={showPass ? "eye-off-outline" : "eye-outline"} size={18} color="#6b7a72" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            <Button label="Sign In" loading={loading} onPress={handleLogin} fullWidth />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
