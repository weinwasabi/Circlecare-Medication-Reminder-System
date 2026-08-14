import React, { useCallback, useEffect, useState } from "react";
import { FlatList, RefreshControl, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { getLogsByPatient, type MedicationLog } from "../../db/queries/medications";
import { useAuthStore } from "../../store/authStore";

export default function HistoryScreen() {
  const user = useAuthStore((s) => s.user);
  const [logs, setLogs]          = useState<MedicationLog[]>([]);
  const [refreshing, setRefresh] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    const data = await getLogsByPatient(user.id);
    setLogs(data);
  }, [user]);

  useEffect(() => { load(); }, []);

  const onRefresh = useCallback(async () => {
    setRefresh(true);
    await load();
    setRefresh(false);
  }, [load]);

  const statusVariant = (s: string) =>
    s === "taken" ? "success" : s === "missed" ? "danger" : "muted";

  const statusIcon = (s: string) =>
    s === "taken"
      ? { name: "checkmark-circle-outline" as const, color: "#277859" }
      : s === "missed"
      ? { name: "close-circle-outline" as const, color: "#e05252" }
      : { name: "remove-circle-outline" as const, color: "#e09a30" };

  // Group logs by date
  const grouped: { date: string; items: MedicationLog[] }[] = [];
  for (const log of logs) {
    const last = grouped[grouped.length - 1];
    if (last && last.date === log.confirmation_date) {
      last.items.push(log);
    } else {
      grouped.push({ date: log.confirmation_date, items: [log] });
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={["top"]}>
      <View className="px-6 pt-6 pb-4">
        <Text className="text-xs text-muted font-medium">Medication</Text>
        <Text className="text-xl font-bold text-gray-800">History</Text>
      </View>

      {logs.length === 0 ? (
        <View className="items-center pt-24">
          <Ionicons name="time-outline" size={40} color="#d1d5db" />
          <Text className="text-muted text-sm mt-3">No history yet</Text>
        </View>
      ) : (
        <FlatList
          data={grouped}
          keyExtractor={(item) => item.date}
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#277859" />
          }
          renderItem={({ item: group }) => (
            <View className="mb-5">
              {/* Date header */}
              <Text className="text-xs font-semibold text-muted uppercase tracking-widest mb-2">
                {group.date}
              </Text>
              {group.items.map((log) => {
                const icon = statusIcon(log.status);
                return (
                  <Card key={log.log_id} className="mb-2 flex-row items-center">
                    <View className="w-9 h-9 rounded-full bg-gray-50 items-center justify-center mr-3">
                      <Ionicons name={icon.name} size={22} color={icon.color} />
                    </View>
                    <View className="flex-1">
                      <Text className="text-sm font-semibold text-gray-800">{log.med_name}</Text>
                      <Text className="text-xs text-muted mt-0.5">
                        {log.time_schedule?.slice(0, 5)} · logged at {log.confirmation_time?.slice(0, 5)}
                      </Text>
                      {log.remarks ? (
                        <Text className="text-xs text-gray-500 mt-0.5 italic">{log.remarks}</Text>
                      ) : null}
                    </View>
                    <Badge label={log.status} variant={statusVariant(log.status)} />
                  </Card>
                );
              })}
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}
