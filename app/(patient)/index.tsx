import React, { useCallback, useEffect, useState } from "react";
import { Alert, RefreshControl, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { MedCard } from "../../components/MedCard";
import { useAuthStore } from "../../store/authStore";
import {
  getTodaySchedules,
  getSchedulesByPatient,
  logMedication,
  getTodayLogForSchedule,
  type MedicationSchedule,
} from "../../db/queries/medications";
import { createAlert } from "../../db/queries/alerts";
import { getPatientById } from "../../db/queries/patients";
import { format } from "date-fns";
import { syncPatientMedicationNotifications } from "../../lib/medicationNotifications";

type LogMap = Record<number, "taken" | "missed" | "skipped">;

export default function PatientHomeScreen() {
  const user   = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const [schedules, setSchedules]   = useState<MedicationSchedule[]>([]);
  const [logMap, setLogMap]         = useState<LogMap>({});
  const [nurseId, setNurseId]       = useState<number | null>(null);
  const [refreshing, setRefresh]    = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    const [scheds, allSchedules, patient] = await Promise.all([
      getTodaySchedules(user.id),
      getSchedulesByPatient(user.id),
      getPatientById(user.id),
    ]);
    setSchedules(scheds);
    setNurseId(patient?.nurse_id ?? null);

    // Build log map
    const map: LogMap = {};
    for (const s of scheds) {
      const log = await getTodayLogForSchedule(user.id, s.schedule_id);
      if (
        log &&
        (log.status === "taken" || log.status === "missed" || log.status === "skipped")
      ) {
        map[s.schedule_id] = log.status;
      }
    }
    setLogMap(map);

    await syncPatientMedicationNotifications(
      user.id,
      allSchedules,
      `${user.fname} ${user.lname}`
    );
  }, [user]);

  useEffect(() => { load(); }, []);

  const onRefresh = useCallback(async () => {
    setRefresh(true);
    await load();
    setRefresh(false);
  }, [load]);

  async function handleLog(schedule: MedicationSchedule, status: "taken" | "skipped") {
    if (!user) return;
    try {
      const logId = await logMedication({ patient_id: user.id, schedule_id: schedule.schedule_id, status });
      setLogMap((prev) => ({ ...prev, [schedule.schedule_id]: status }));

      // Create alert for nurse if skipped
      if (status === "skipped" && nurseId) {
        await createAlert({
          patient_id: user.id,
          nurse_id: nurseId,
          log_id: logId,
          alert_type: "skipped",
          alert_message: `${user.fname} ${user.lname} skipped ${schedule.med_name} (${schedule.time_schedule?.slice(0, 5)})`,
        });
      }
    } catch (e) {
      Alert.alert("Error", "Could not log medication.");
    }
  }

  const today        = format(new Date(), "EEEE, MMMM d");
  const taken        = Object.values(logMap).filter((s) => s === "taken").length;
  const total        = schedules.length;
  const progress     = total > 0 ? taken / total : 0;

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

        {/* Progress card */}
        <View className="px-6 mb-6">
          <View className="bg-primary-600 rounded-3xl p-5">
            <Text className="font-menu text-primary-100 text-xs mb-1">Today's Progress</Text>
            <Text className="font-heading text-white text-2xl mb-3">
              {taken}/{total} Medications
            </Text>
            <View className="bg-primary-500 rounded-full h-2 overflow-hidden">
              <View
                className="bg-white h-2 rounded-full"
                style={{ width: `${Math.round(progress * 100)}%` }}
              />
            </View>
            <Text className="text-primary-100 text-xs mt-2">
              {total - taken > 0
                ? `${total - taken} remaining today`
                : "All done! Great job"}
            </Text>
          </View>
        </View>

        {/* Medication list */}
        <View className="px-6 mb-8">
          <Text className="font-menu text-xs text-muted uppercase tracking-widest mb-3">
            Today's Medications
          </Text>
          {schedules.length === 0 ? (
            <View className="items-center py-10 bg-card rounded-2xl border border-border">
              <Ionicons name="medkit-outline" size={36} color="#d1d5db" />
              <Text className="text-sm text-muted mt-2">No medications scheduled for today</Text>
            </View>
          ) : (
            schedules.map((s) => (
              <MedCard
                key={s.schedule_id}
                schedule={s}
                logged={logMap[s.schedule_id] ?? null}
                onTake={() => handleLog(s, "taken")}
                onSkip={() => handleLog(s, "skipped")}
              />
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
