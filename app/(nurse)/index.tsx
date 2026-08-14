import React, { useCallback, useEffect, useState } from "react";
import { RefreshControl, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Card } from "../../components/ui/Card";
import { Avatar } from "../../components/ui/Avatar";
import { useAuthStore } from "../../store/authStore";
import { getPatientsByNurse, type Patient } from "../../db/queries/patients";
import { getUnreadAlertCount } from "../../db/queries/alerts";
import { format } from "date-fns";

export default function NurseDashboard() {
  const user   = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const [patients, setPatients]     = useState<Patient[]>([]);
  const [alertCount, setAlertCount] = useState(0);
  const [refreshing, setRefresh]    = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    const [p, a] = await Promise.all([
      getPatientsByNurse(user.id),
      getUnreadAlertCount(user.id),
    ]);
    setPatients(p);
    setAlertCount(a);
  }, [user]);

  useEffect(() => { load(); }, []);

  const onRefresh = useCallback(async () => {
    setRefresh(true);
    await load();
    setRefresh(false);
  }, [load]);

  const today = format(new Date(), "EEEE, MMMM d");

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={["top"]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#277859" />}
      >
        {/* Header */}
        <View className="px-6 pt-6 pb-4 flex-row items-center justify-between">
          <View>
            <Text className="font-menu text-xs text-muted">{today}</Text>
            <Text className="font-heading text-2xl text-ink">Hi, {user?.fname}</Text>
          </View>
          <TouchableOpacity
            onPress={logout}
            className="w-10 h-10 rounded-full bg-card border border-border items-center justify-center"
          >
            <Ionicons name="log-out-outline" size={20} color="#e05252" />
          </TouchableOpacity>
        </View>

        {/* Summary cards */}
        <View className="px-6 mb-6">
          <View className="flex-row gap-3">
            <Card className="flex-1">
              <Ionicons name="people-outline" size={20} color="#44604f" />
              <Text className="font-heading text-2xl text-primary-700 mt-2">{patients.length}</Text>
              <Text className="text-xs text-muted">My Patients</Text>
            </Card>
            <Card className="flex-1">
              <Ionicons name="notifications-outline" size={20} color="#e05252" />
              <Text className="font-heading text-2xl text-red-600 mt-2">{alertCount}</Text>
              <Text className="text-xs text-muted">Unread Alerts</Text>
            </Card>
          </View>
        </View>

        {/* Patient list preview */}
        <View className="px-6 mb-8">
          <Text className="font-menu text-xs text-muted uppercase tracking-widest mb-3">
            My Patients
          </Text>
          {patients.length === 0 ? (
            <View className="items-center py-10">
              <Ionicons name="people-outline" size={36} color="#d1d5db" />
              <Text className="text-sm text-muted mt-2">No patients assigned yet</Text>
            </View>
          ) : (
            patients.slice(0, 5).map((p) => (
              <View
                key={p.patient_id}
                className="flex-row items-center bg-card rounded-2xl px-4 py-3 mb-3 border border-border"
              >
                <Avatar name={`${p.fname} ${p.lname}`} />
                <View className="flex-1 ml-3">
                  <Text className="font-heading text-sm text-ink">
                    {p.fname} {p.lname}
                  </Text>
                  <Text className="text-xs text-muted mt-0.5">
                    {p.illness_name} · {p.room_name}
                  </Text>
                </View>
                <View className={`w-2 h-2 rounded-full ${p.status === "active" ? "bg-primary-500" : "bg-gray-300"}`} />
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
