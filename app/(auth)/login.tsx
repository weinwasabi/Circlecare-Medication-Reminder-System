import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Button } from "../../components/ui/Button";
import { loginNurse } from "../../db/queries/nurses";
import { loginPatient } from "../../db/queries/patients";
import { useAuthStore } from "../../store/authStore";

type Role = "nurse" | "patient";

const roles: { key: Role; label: string; icon: any; desc: string }[] = [
  { key: "nurse", label: "Staff", icon: "medical-outline", desc: "Manage care plans & patient visits" },
  { key: "patient", label: "Patient", icon: "person-outline", desc: "View schedules and follow-ups" },
];

export default function LoginScreen() {
  const [role, setRole] = useState<Role>("patient");
  const [identifier, setIdent] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);

  async function handleLogin() {
    if (!identifier.trim() || !password.trim()) {
      Alert.alert("Required", "Please fill in all fields.");
      return;
    }
    setLoading(true);
    try {
      if (role === "nurse") {
        const nurse = await loginNurse(identifier.trim(), password.trim());
        if (!nurse) {
          Alert.alert("Login Failed", "Invalid credentials.");
          return;
        }
        setUser({ id: nurse.id, fname: nurse.fname, lname: nurse.lname, email: nurse.email, role: "nurse" });
      } else {
        const patient = await loginPatient(identifier.trim(), password.trim());
        if (!patient) {
          Alert.alert("Login Failed", "Invalid username or password.");
          return;
        }
        setUser({ id: patient.patient_id, fname: patient.fname, lname: patient.lname, username: patient.username, role: "patient" });
      }
    } catch {
      Alert.alert("Error", "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-surface">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className="flex-1 px-6 pt-16 pb-8">
            <View className="items-center mb-10">
              <View className="w-16 h-16 rounded-2xl bg-primary-600 items-center justify-center mb-4">
                <Ionicons name="heart-outline" size={32} color="#fff" />
              </View>
              <Text className="font-heading text-3xl text-ink">MHO POLOMOLOK</Text>
              <Text className="font-sans text-sm text-muted mt-1">Teen Center Mental Health Patient Scheduling</Text>
            </View>

            <Text className="font-menu text-xs text-muted uppercase tracking-widest mb-3">
              Sign in as
            </Text>
            <View className="flex-row gap-3 mb-6">
              {roles.map((r) => (
                <TouchableOpacity
                  key={r.key}
                  onPress={() => setRole(r.key)}
                  activeOpacity={0.7}
                  className={`flex-1 rounded-2xl p-4 border ${
                    role === r.key
                      ? "bg-primary-600 border-primary-600"
                      : "bg-card border-border"
                  }`}
                >
                  <Ionicons
                    name={r.icon}
                    size={22}
                    color={role === r.key ? "#fff" : "#277859"}
                  />
                  <Text
                    className={`font-heading text-sm mt-2 ${
                      role === r.key ? "text-white" : "text-ink"
                    }`}
                  >
                    {r.label}
                  </Text>
                  <Text
                    className={`text-xs mt-0.5 ${
                      role === r.key ? "text-primary-100" : "text-muted"
                    }`}
                  >
                    {r.desc}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View className="gap-3 mb-6">
              <View>
                <Text className="font-menu text-xs text-muted mb-1.5">
                  {role === "nurse" ? "Email" : "Username"}
                </Text>
                <TextInput
                  value={identifier}
                  onChangeText={setIdent}
                  placeholder={role === "nurse" ? "nurse@circlecare.app" : "your.username"}
                  placeholderTextColor="#9ca3af"
                  autoCapitalize="none"
                  keyboardType={role === "nurse" ? "email-address" : "default"}
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
                    <Ionicons
                      name={showPass ? "eye-off-outline" : "eye-outline"}
                      size={18}
                      color="#6b7a72"
                    />
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            <Button label="Sign In" loading={loading} onPress={handleLogin} fullWidth />

            <TouchableOpacity
              onPress={() => router.push("/(auth)/admin-login")}
              className="mt-5 items-center"
            >
              <Text className="font-menu text-sm text-primary-600">
                Sign in as Admin →
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
