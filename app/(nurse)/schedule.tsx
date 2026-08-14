import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { useAuthStore } from "../../store/authStore";
import { getPatientsByNurse, type Patient } from "../../db/queries/patients";
import {
  createMedication,
  createSchedule,
  findMedicationByName,
  getSchedulesByPatient,
  type MedicationSchedule,
} from "../../db/queries/medications";
import { syncPatientMedicationNotifications } from "../../lib/medicationNotifications";

const frequencies = ["Daily", "Twice a Day", "Three Times a Day"] as const;
const quickTimes = ["06:00", "08:00", "12:00", "18:00", "21:00"];

function isoDate(offsetDays = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().split("T")[0];
}

function formatPatientName(patient?: Patient | null) {
  return patient ? `${patient.fname} ${patient.lname}` : "Patient";
}

export default function NurseScheduleScreen() {
  const user = useAuthStore((s) => s.user);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [recentSchedules, setRecentSchedules] = useState<MedicationSchedule[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [medicationForm, setMedicationForm] = useState({
    med_name: "",
    dosage: "",
    description: "",
  });
  const [form, setForm] = useState({
    patient_id: 0,
    time_schedule: "08:00",
    frequency: "Daily",
    start_date: isoDate(0),
    end_date: isoDate(6),
  });

  const selectedPatient = useMemo(
    () => patients.find((patient) => patient.patient_id === form.patient_id) ?? null,
    [patients, form.patient_id]
  );

  const load = useCallback(async () => {
    if (!user) return;

    const patientData = await getPatientsByNurse(user.id);
    setPatients(patientData);
    setForm((prev) => ({
      ...prev,
      patient_id: prev.patient_id || patientData[0]?.patient_id || 0,
    }));
  }, [user]);

  const loadRecentSchedules = useCallback(async () => {
    if (!form.patient_id) {
      setRecentSchedules([]);
      return;
    }

    const schedules = await getSchedulesByPatient(form.patient_id);
    setRecentSchedules(schedules);
  }, [form.patient_id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    loadRecentSchedules();
  }, [loadRecentSchedules]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    await loadRecentSchedules();
    setRefreshing(false);
  }, [load, loadRecentSchedules]);

  async function resolveMedicationId() {
    if (!medicationForm.med_name.trim()) {
      throw new Error("Enter the medication name.");
    }

    const existing = await findMedicationByName(medicationForm.med_name.trim());
    if (existing) return existing.med_id;

    return await createMedication({
      med_name: medicationForm.med_name.trim(),
      dosage: medicationForm.dosage.trim() || "Custom dosage",
      description: medicationForm.description.trim() || "Added by nurse",
    });
  }

  async function handleCreateSchedule() {
    if (!user) return;
    if (!form.patient_id || !form.time_schedule) {
      Alert.alert("Required", "Patient and reminder time are required.");
      return;
    }
    if (!form.start_date || !form.end_date) {
      Alert.alert("Required", "Start date and end date are required.");
      return;
    }
    if (form.end_date < form.start_date) {
      Alert.alert("Invalid Dates", "End date must be after or equal to the start date.");
      return;
    }

    setSaving(true);
    try {
      const medicationId = await resolveMedicationId();
      await createSchedule({
        patient_id: form.patient_id,
        nurse_id: user.id,
        med_id: medicationId,
        time_schedule: form.time_schedule,
        frequency: form.frequency,
        start_date: form.start_date,
        end_date: form.end_date,
      });

      await load();
      const schedules = await getSchedulesByPatient(form.patient_id);
      setRecentSchedules(schedules);

      if (selectedPatient) {
        await syncPatientMedicationNotifications(
          selectedPatient.patient_id,
          schedules,
          formatPatientName(selectedPatient)
        );
      }

      setMedicationForm({ med_name: "", dosage: "", description: "" });
      setForm((prev) => ({
        ...prev,
        time_schedule: "08:00",
        frequency: "Daily",
        start_date: isoDate(0),
        end_date: isoDate(6),
      }));

      Alert.alert("Saved", "Medication schedule and patient reminder were created.");
    } catch (e: any) {
      Alert.alert("Error", e.message ?? "Could not create medication schedule.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={["top"]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#277859" />}
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        <View className="px-6 pt-6 pb-4">
          <Text className="text-xs text-muted font-medium">Reminder Setup</Text>
          <Text className="text-xl font-bold text-gray-800">Medication Alarm</Text>
        </View>

        <View className="px-6">
          <Card className="mb-5">
            <View className="flex-row items-center justify-between mb-4">
              <View>
                <Text className="text-sm font-semibold text-gray-800">Create Patient Reminder</Text>
              </View>
              <View className="w-11 h-11 rounded-2xl bg-primary-50 items-center justify-center">
                <Ionicons name="alarm-outline" size={22} color="#277859" />
              </View>
            </View>

            <View className="mb-4">
              <Text className="text-xs font-medium text-muted mb-1.5">Patient</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View className="flex-row">
                  {patients.map((patient) => (
                    <TouchableOpacity
                      key={patient.patient_id}
                      onPress={() => setForm((prev) => ({ ...prev, patient_id: patient.patient_id }))}
                      className={`mr-2 px-3 py-2 rounded-xl border ${
                        form.patient_id === patient.patient_id
                          ? "bg-primary-600 border-primary-600"
                          : "bg-white border-border"
                      }`}
                    >
                      <Text className={`text-xs font-medium ${form.patient_id === patient.patient_id ? "text-white" : "text-gray-700"}`}>
                        {patient.fname} {patient.lname}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            <View className="mb-4">
              <Text className="text-xs font-medium text-muted mb-1.5">Medication Name</Text>
              <TextInput
                value={medicationForm.med_name}
                onChangeText={(med_name) => setMedicationForm((prev) => ({ ...prev, med_name }))}
                placeholder="Medication name"
                placeholderTextColor="#9ca3af"
                className="bg-white border border-border rounded-xl px-4 py-3.5 text-sm text-gray-800"
              />
            </View>

            <View className="mb-4">
              <Text className="text-xs font-medium text-muted mb-1.5">Dosage</Text>
              <TextInput
                value={medicationForm.dosage}
                onChangeText={(dosage) => setMedicationForm((prev) => ({ ...prev, dosage }))}
                placeholder="Example: 500mg after meals"
                placeholderTextColor="#9ca3af"
                className="bg-white border border-border rounded-xl px-4 py-3.5 text-sm text-gray-800"
              />
            </View>

            <View className="mb-4">
              <Text className="text-xs font-medium text-muted mb-1.5">Notes</Text>
              <TextInput
                value={medicationForm.description}
                onChangeText={(description) => setMedicationForm((prev) => ({ ...prev, description }))}
                placeholder="Optional instructions"
                placeholderTextColor="#9ca3af"
                className="bg-white border border-border rounded-xl px-4 py-3.5 text-sm text-gray-800"
              />
            </View>

            <View className="mb-4">
              <Text className="text-xs font-medium text-muted mb-1.5">Reminder Time</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View className="flex-row">
                  {quickTimes.map((time) => (
                    <TouchableOpacity
                      key={time}
                      onPress={() => setForm((prev) => ({ ...prev, time_schedule: time }))}
                      className={`mr-2 px-3 py-2 rounded-xl border ${
                        form.time_schedule === time ? "bg-primary-600 border-primary-600" : "bg-white border-border"
                      }`}
                    >
                      <Text className={`text-xs font-medium ${form.time_schedule === time ? "text-white" : "text-gray-700"}`}>
                        {time}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
              <TextInput
                value={form.time_schedule}
                onChangeText={(time_schedule) => setForm((prev) => ({ ...prev, time_schedule }))}
                placeholder="HH:MM"
                placeholderTextColor="#9ca3af"
                className="bg-white border border-border rounded-xl px-4 py-3.5 text-sm text-gray-800 mt-3"
              />
            </View>

            <View className="mb-4">
              <Text className="text-xs font-medium text-muted mb-1.5">Frequency</Text>
              <View className="flex-row gap-2">
                {frequencies.map((frequency) => (
                  <TouchableOpacity
                    key={frequency}
                    onPress={() => setForm((prev) => ({ ...prev, frequency }))}
                    className={`flex-1 py-3 rounded-xl border items-center ${
                      form.frequency === frequency ? "bg-primary-600 border-primary-600" : "bg-white border-border"
                    }`}
                  >
                    <Text className={`text-xs font-semibold text-center ${form.frequency === frequency ? "text-white" : "text-gray-700"}`}>
                      {frequency === "Three Times a Day" ? "3 Times" : frequency}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View className="mb-4">
              <Text className="text-xs font-medium text-muted mb-1.5">Start Date</Text>
              <View className="flex-row gap-2 mb-2">
                <TouchableOpacity
                  onPress={() => setForm((prev) => ({ ...prev, start_date: isoDate(0) }))}
                  className="rounded-xl border border-border px-3 py-2 bg-white"
                >
                  <Text className="text-xs font-medium text-gray-700">Today</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setForm((prev) => ({ ...prev, start_date: isoDate(1) }))}
                  className="rounded-xl border border-border px-3 py-2 bg-white"
                >
                  <Text className="text-xs font-medium text-gray-700">Tomorrow</Text>
                </TouchableOpacity>
              </View>
              <TextInput
                value={form.start_date}
                onChangeText={(start_date) => setForm((prev) => ({ ...prev, start_date }))}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#9ca3af"
                className="bg-white border border-border rounded-xl px-4 py-3.5 text-sm text-gray-800"
              />
            </View>

            <View className="mb-5">
              <Text className="text-xs font-medium text-muted mb-1.5">End Date</Text>
              <View className="flex-row gap-2 mb-2">
                <TouchableOpacity
                  onPress={() => setForm((prev) => ({ ...prev, end_date: prev.start_date }))}
                  className="rounded-xl border border-border px-3 py-2 bg-white"
                >
                  <Text className="text-xs font-medium text-gray-700">Same Day</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setForm((prev) => ({ ...prev, end_date: isoDate(6) }))}
                  className="rounded-xl border border-border px-3 py-2 bg-white"
                >
                  <Text className="text-xs font-medium text-gray-700">1 Week</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setForm((prev) => ({ ...prev, end_date: isoDate(29) }))}
                  className="rounded-xl border border-border px-3 py-2 bg-white"
                >
                  <Text className="text-xs font-medium text-gray-700">1 Month</Text>
                </TouchableOpacity>
              </View>
              <TextInput
                value={form.end_date}
                onChangeText={(end_date) => setForm((prev) => ({ ...prev, end_date }))}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#9ca3af"
                className="bg-white border border-border rounded-xl px-4 py-3.5 text-sm text-gray-800"
              />
            </View>

            <Button label="Create Medication Alarm" loading={saving} onPress={handleCreateSchedule} fullWidth />
          </Card>

          <Text className="text-xs text-muted uppercase tracking-widest mb-3">Selected Patient Schedule</Text>
          {recentSchedules.length === 0 ? (
            <View className="items-center py-10 bg-white border border-border rounded-2xl">
              <Ionicons name="calendar-outline" size={34} color="#d1d5db" />
              <Text className="text-sm text-muted mt-2">No schedules for {formatPatientName(selectedPatient)}</Text>
            </View>
          ) : (
            recentSchedules.map((schedule) => (
              <Card key={schedule.schedule_id} className="mb-3">
                <Text className="text-sm font-semibold text-gray-800">{schedule.med_name}</Text>
                <Text className="text-xs text-muted mt-0.5">{schedule.dosage}</Text>
                <Text className="text-xs text-muted mt-2">
                  {schedule.time_schedule} • {schedule.frequency}
                </Text>
                <Text className="text-xs text-muted mt-1">
                  {schedule.start_date} to {schedule.end_date}
                </Text>
              </Card>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
