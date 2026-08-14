import React, { useCallback, useEffect, useState } from "react";
import { FlatList, RefreshControl, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { getSchedulesByPatient, type MedicationSchedule } from "../../db/queries/medications";
import { useAuthStore } from "../../store/authStore";
import { syncPatientMedicationNotifications } from "../../lib/medicationNotifications";

export default function ScheduleScreen() {
  const user = useAuthStore((s) => s.user);
  const [schedules, setSchedules] = useState<MedicationSchedule[]>([]);
  const [refreshing, setRefresh]  = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    const data = await getSchedulesByPatient(user.id);
    setSchedules(data);
    await syncPatientMedicationNotifications(user.id, data, `${user.fname} ${user.lname}`);
  }, [user]);

  useEffect(() => { load(); }, []);

  const onRefresh = useCallback(async () => {
    setRefresh(true);
    await load();
    setRefresh(false);
  }, [load]);

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={["top"]}>
      <View className="px-6 pt-6 pb-4">
        <Text className="text-xs text-muted font-medium">My Medications</Text>
        <Text className="text-xl font-bold text-gray-800">Schedule</Text>
      </View>

      <FlatList
        data={schedules}
        keyExtractor={(item) => String(item.schedule_id)}
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#277859" />}
        ListEmptyComponent={
          <View className="items-center pt-20">
            <Ionicons name="calendar-outline" size={40} color="#d1d5db" />
            <Text className="text-muted text-sm mt-3">No active schedules</Text>
          </View>
        }
        renderItem={({ item }) => (
          <Card className="mb-3">
            <View className="flex-row items-start justify-between">
              <View className="flex-1 mr-3">
                <Text className="text-base font-semibold text-gray-800">{item.med_name}</Text>
                <Text className="text-sm text-muted mt-0.5">{item.dosage}</Text>
                <View className="flex-row flex-wrap gap-3 mt-2">
                  <View className="flex-row items-center">
                    <Ionicons name="time-outline" size={13} color="#6b7a72" />
                    <Text className="text-xs text-muted ml-1">{item.time_schedule?.slice(0, 5)}</Text>
                  </View>
                  <View className="flex-row items-center">
                    <Ionicons name="repeat-outline" size={13} color="#6b7a72" />
                    <Text className="text-xs text-muted ml-1">{item.frequency}</Text>
                  </View>
                </View>
                <View className="flex-row items-center mt-1">
                  <Ionicons name="calendar-outline" size={13} color="#6b7a72" />
                  <Text className="text-xs text-muted ml-1">
                    {item.start_date} → {item.end_date}
                  </Text>
                </View>
              </View>
              <Badge label={item.status ?? "active"} variant="success" />
            </View>
          </Card>
        )}
      />
    </SafeAreaView>
  );
}
