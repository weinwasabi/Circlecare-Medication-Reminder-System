import React, { useCallback, useEffect, useState } from "react";
import { FlatList, RefreshControl, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { getDatabase } from "../../db/database";
import { useAuthStore } from "../../store/authStore";

interface RecentLog {
  log_id: number;
  patient_fname: string;
  patient_lname: string;
  med_name: string;
  status: string;
  confirmation_date: string;
  confirmation_time: string;
  room_name: string;
}

export default function MedicationsScreen() {
  const user = useAuthStore((s) => s.user);
  const [logs, setLogs]          = useState<RecentLog[]>([]);
  const [refreshing, setRefresh] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    const db = await getDatabase();
    const data = await db.getAllAsync<RecentLog>(`
      SELECT ml.log_id, p.fname as patient_fname, p.lname as patient_lname,
             m.med_name, ml.status, ml.confirmation_date, ml.confirmation_time,
             r.room_name
      FROM medication_logs ml
      JOIN patients p ON ml.patient_id = p.patient_id
      JOIN medication_schedules ms ON ml.schedule_id = ms.schedule_id
      JOIN medications m ON ms.med_id = m.med_id
      LEFT JOIN rooms r ON p.room_id = r.room_id
      WHERE p.nurse_id = ?
      ORDER BY ml.created_at DESC
      LIMIT 40
    `, [user.id]);
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

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={["top"]}>
      <View className="px-6 pt-6 pb-4">
        <Text className="text-xs text-muted font-medium">Overview</Text>
        <Text className="text-xl font-bold text-gray-800">Medication Logs</Text>
      </View>

      <FlatList
        data={logs}
        keyExtractor={(item) => String(item.log_id)}
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#277859" />}
        ListEmptyComponent={
          <View className="items-center pt-20">
            <Ionicons name="medkit-outline" size={40} color="#d1d5db" />
            <Text className="text-muted text-sm mt-3">No medication logs yet</Text>
          </View>
        }
        renderItem={({ item }) => (
          <Card className="mb-3 flex-row items-start">
            <View className="flex-1 mr-3">
              <Text className="text-sm font-semibold text-gray-800">
                {item.patient_fname} {item.patient_lname}
              </Text>
              <Text className="text-xs text-muted mt-0.5">{item.room_name}</Text>
              <Text className="text-sm text-gray-700 mt-1 font-medium">{item.med_name}</Text>
              <Text className="text-xs text-muted mt-0.5">
                {item.confirmation_date} · {item.confirmation_time?.slice(0, 5)}
              </Text>
            </View>
            <Badge label={item.status} variant={statusVariant(item.status)} />
          </Card>
        )}
      />
    </SafeAreaView>
  );
}
