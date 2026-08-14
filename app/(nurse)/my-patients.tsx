import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { PatientRow } from "../../components/PatientRow";
import { Button } from "../../components/ui/Button";
import { getPatientsByNurse, type Patient } from "../../db/queries/patients";
import {
  createSchedule,
  getAllMedications,
  getSchedulesByPatient,
  type Medication,
  type MedicationSchedule,
} from "../../db/queries/medications";
import { useAuthStore } from "../../store/authStore";

const emptyScheduleForm = {
  med_id: 0,
  time_schedule: "",
  frequency: "Daily",
  start_date: new Date().toISOString().split("T")[0],
  end_date: "",
};

export default function MyPatientsScreen() {
  const user = useAuthStore((s) => s.user);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [patientSchedules, setPatientSchedules] = useState<MedicationSchedule[]>([]);
  const [refreshing, setRefresh] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyScheduleForm);

  const load = useCallback(async () => {
    if (!user) return;
    const [patientData, medicationData] = await Promise.all([
      getPatientsByNurse(user.id),
      getAllMedications(),
    ]);
    setPatients(patientData);
    setMedications(medicationData);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefresh(true);
    await load();
    setRefresh(false);
  }, [load]);

  useEffect(() => {
    if (medications.length && !form.med_id) {
      setForm((prev) => ({ ...prev, med_id: medications[0].med_id }));
    }
  }, [medications, form.med_id]);

  async function openPatient(patient: Patient) {
    setSelectedPatient(patient);
    setShowModal(true);
    setForm((prev) => ({
      ...prev,
      med_id: medications[0]?.med_id ?? prev.med_id,
    }));
    const schedules = await getSchedulesByPatient(patient.patient_id);
    setPatientSchedules(schedules);
  }

  function closeModal() {
    setShowModal(false);
    setSelectedPatient(null);
    setPatientSchedules([]);
    setForm({
      ...emptyScheduleForm,
      med_id: medications[0]?.med_id ?? 0,
    });
  }

  async function handleCreateSchedule() {
    if (!selectedPatient || !user) return;
    if (!form.med_id || !form.time_schedule || !form.start_date) {
      Alert.alert("Required", "Medication, time, and start date are required.");
      return;
    }

    setSaving(true);
    try {
      await createSchedule({
        patient_id: selectedPatient.patient_id,
        nurse_id: user.id,
        med_id: form.med_id,
        time_schedule: form.time_schedule,
        frequency: form.frequency,
        start_date: form.start_date,
        end_date: form.end_date || form.start_date,
      });
      const schedules = await getSchedulesByPatient(selectedPatient.patient_id);
      setPatientSchedules(schedules);
      setForm((prev) => ({
        ...prev,
        time_schedule: "",
        frequency: "Daily",
        start_date: new Date().toISOString().split("T")[0],
        end_date: "",
      }));
    } catch (e: any) {
      Alert.alert("Error", e.message ?? "Could not schedule medication.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={["top"]}>
      <View className="px-6 pt-6 pb-4">
        <Text className="text-xs text-muted font-medium">My Patients</Text>
        <Text className="text-xl font-bold text-gray-800">
          {patients.length} Patient{patients.length !== 1 ? "s" : ""}
        </Text>
      </View>

      <FlatList
        data={patients}
        keyExtractor={(item) => String(item.patient_id)}
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#277859" />}
        ListEmptyComponent={
          <View className="items-center pt-20">
            <Ionicons name="people-outline" size={40} color="#d1d5db" />
            <Text className="text-muted text-sm mt-3">No patients assigned to you</Text>
          </View>
        }
        renderItem={({ item }) => <PatientRow patient={item} onPress={() => openPatient(item)} />}
      />

      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView className="flex-1 bg-surface">
          <View className="px-6 pt-6 pb-4 flex-row items-center justify-between border-b border-border">
            <View>
              <Text className="text-lg font-bold text-gray-800">
                {selectedPatient?.fname} {selectedPatient?.lname}
              </Text>
              <Text className="text-xs text-muted mt-1">Medication management</Text>
            </View>
            <TouchableOpacity onPress={closeModal}>
              <Ionicons name="close" size={24} color="#6b7a72" />
            </TouchableOpacity>
          </View>

          <ScrollView className="px-6 pt-5" showsVerticalScrollIndicator={false}>
            <View className="gap-4 pb-10">
              <View className="pt-3">
                <Text className="text-sm font-semibold text-gray-800 mb-3">Current schedules</Text>
                {patientSchedules.length === 0 ? (
                  <View className="items-center py-8 border border-dashed border-border rounded-2xl bg-white">
                    <Ionicons name="calendar-outline" size={32} color="#d1d5db" />
                    <Text className="text-muted text-sm mt-3">No schedules for this patient yet</Text>
                  </View>
                ) : (
                  patientSchedules.map((schedule) => (
                    <View key={schedule.schedule_id} className="bg-white rounded-2xl border border-border p-4 mb-3">
                      <Text className="text-sm font-semibold text-gray-800">{schedule.med_name}</Text>
                      <Text className="text-xs text-muted mt-0.5">{schedule.dosage}</Text>
                      <Text className="text-xs text-muted mt-2">
                        {schedule.time_schedule} • {schedule.frequency}
                      </Text>
                      <Text className="text-xs text-muted mt-1">
                        {schedule.start_date} to {schedule.end_date}
                      </Text>
                    </View>
                  ))
                )}
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
