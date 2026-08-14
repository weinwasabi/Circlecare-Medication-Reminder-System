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
import {
  createPatient,
  deletePatient,
  getAllPatients,
  updatePatient,
  updatePatientStatus,
  createIllness,
  type Patient,
} from "../../db/queries/patients";
import { getAllNurses, type Nurse } from "../../db/queries/nurses";
import { getDatabase } from "../../db/database";
import { useAuthStore } from "../../store/authStore";
import { getAssignableRooms, type Room } from "../../db/queries/rooms";

interface Illness {
  illness_id: number;
  illness_name: string;
}

const emptyForm = {
  fname: "",
  lname: "",
  age: "",
  sex: "Male",
  address: "",
  contact: "",
  username: "",
  password: "",
  nurse_id: 0,
  illness_id: 0,
  room_id: 0,
  status: "active",
  customIllness: "",
};

export default function PatientsScreen() {
  const user = useAuthStore((s) => s.user);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [nurses, setNurses] = useState<Nurse[]>([]);
  const [illnesses, setIllnesses] = useState<Illness[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [refreshing, setRefresh] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<Patient | null>(null);
  const [modalMode, setModalMode] = useState<"full" | "reassign">("full");
  const [form, setForm] = useState(emptyForm);

  const load = useCallback(async () => {
    const db = await getDatabase();
    const [patientData, nurseData, illnessData, roomData] = await Promise.all([
      getAllPatients(),
      getAllNurses(),
      db.getAllAsync<Illness>(`SELECT illness_id, illness_name FROM illness ORDER BY illness_name ASC`),
      getAssignableRooms(),
    ]);

    setPatients(patientData);
    setNurses(nurseData);
    setIllnesses(illnessData);
    setRooms(roomData);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefresh(true);
    await load();
    setRefresh(false);
  }, [load]);

  function resetForm() {
    setForm({
      ...emptyForm,
      nurse_id: nurses[0]?.id ?? 0,
      illness_id: illnesses[0]?.illness_id ?? 0,
      room_id: rooms[0]?.room_id ?? 0,
    });
  }

  useEffect(() => {
    if (!showModal && !editing) {
      resetForm();
    }
  }, [nurses, illnesses, rooms, showModal, editing]);

  function openCreate() {
    setModalMode("full");
    setEditing(null);
    resetForm();
    setShowModal(true);
  }

  function openEdit(patient: Patient) {
    const roomOptions = rooms.some((room) => room.room_id === patient.room_id)
      ? rooms
      : [
          ...rooms,
          {
            room_id: patient.room_id,
            room_name: patient.room_name ?? "Assigned Room",
            room_type: "Current",
            capacity: 1,
            status: "available",
          },
        ];

    setRooms(roomOptions);
    setModalMode("full");
    setEditing(patient);
    const illnessExists = illnesses.some((illness) => illness.illness_id === patient.illness_id);
    setForm({
      fname: patient.fname,
      lname: patient.lname,
      age: String(patient.age ?? ""),
      sex: patient.sex ?? "Male",
      address: patient.address ?? "",
      contact: patient.contact ?? "",
      username: patient.username,
      password: "",
      nurse_id: patient.nurse_id,
      illness_id: illnessExists ? patient.illness_id : -1,
      room_id: patient.room_id,
      status: patient.status ?? "active",
      customIllness: illnessExists ? "" : patient.illness_name ?? "",
    });
    setShowModal(true);
  }

  function openReassign(patient: Patient) {
    const roomOptions = rooms.some((room) => room.room_id === patient.room_id)
      ? rooms
      : [
          ...rooms,
          {
            room_id: patient.room_id,
            room_name: patient.room_name ?? "Assigned Room",
            room_type: "Current",
            capacity: 1,
            status: "available",
          },
        ];

    setRooms(roomOptions);
    setModalMode("reassign");
    setEditing(patient);
    setForm({
      fname: patient.fname,
      lname: patient.lname,
      age: String(patient.age ?? ""),
      sex: patient.sex ?? "Male",
      address: patient.address ?? "",
      contact: patient.contact ?? "",
      username: patient.username,
      password: "",
      nurse_id: patient.nurse_id,
      illness_id: patient.illness_id,
      room_id: patient.room_id,
      status: patient.status ?? "active",
      customIllness: "",
    });
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditing(null);
    setModalMode("full");
    resetForm();
  }

  async function handleSave() {
    if (!form.fname || !form.lname || !form.username || !form.age) {
      Alert.alert("Required", "Fill in all required fields.");
      return;
    }
    if (!editing && !form.password) {
      Alert.alert("Required", "Password is required for a new patient.");
      return;
    }
    if (!form.nurse_id || !form.illness_id || !form.room_id) {
      Alert.alert("Required", "Select a nurse, illness, and room.");
      return;
    }
    if (form.illness_id === -1 && !form.customIllness.trim()) {
      Alert.alert("Required", "Please specify the illness name.");
      return;
    }

    setSaving(true);
    try {
      let illnessId = form.illness_id;
      if (form.illness_id === -1) {
        illnessId = await createIllness(form.customIllness.trim());
        // Reload illnesses to include the new one
        const db = await getDatabase();
        const illnessData = await db.getAllAsync<Illness>(`SELECT illness_id, illness_name FROM illness ORDER BY illness_name ASC`);
        setIllnesses(illnessData);
      }

      const payload = {
        ...form,
        age: Number(form.age),
        illness_id: illnessId,
      };
      const nurseWasChanged = Boolean(editing && editing.nurse_id !== form.nurse_id);

      if (editing) {
        await updatePatient(editing.patient_id, payload);
      } else {
        await createPatient({ ...payload, password: form.password, created_by_admin: user!.id });
      }

      closeModal();
      await load();

      if (editing && modalMode === "reassign" && nurseWasChanged) {
        const nurse = nurses.find((item) => item.id === form.nurse_id);
        Alert.alert(
          "Nurse Updated",
          `${editing.fname} ${editing.lname} is now assigned to ${nurse?.fname ?? "the selected"} ${nurse?.lname ?? "nurse"}.`
        );
      }
    } catch (e: any) {
      Alert.alert("Error", e.message ?? "Could not save patient.");
    } finally {
      setSaving(false);
    }
  }

  function confirmDelete(patient: Patient) {
    Alert.alert("Delete Patient", `Remove ${patient.fname} ${patient.lname}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deletePatient(patient.patient_id);
            await load();
          } catch (e: any) {
            Alert.alert("Error", e.message ?? "Could not delete patient.");
          }
        },
      },
    ]);
  }

  function confirmDischarge(patient: Patient) {
    Alert.alert("Discharge Patient", `Mark ${patient.fname} ${patient.lname} as discharged?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Discharge",
        onPress: async () => {
          await updatePatientStatus(patient.patient_id, "discharged");
          await load();
        },
      },
    ]);
  }

  function SelectRow({
    label,
    value,
    options,
    onSelect,
  }: {
    label: string;
    value: number;
    options: { id: number; label: string }[];
    onSelect: (id: number) => void;
  }) {
    return (
      <View>
        <Text className="text-xs font-medium text-muted mb-1.5">{label}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View className="flex-row">
            {options.map((option) => (
              <TouchableOpacity
                key={option.id}
                onPress={() => onSelect(option.id)}
                className={`mr-2 px-3 py-2 rounded-xl border ${
                  value === option.id ? "bg-primary-600 border-primary-600" : "bg-white border-border"
                }`}
              >
                <Text className={`text-xs font-medium ${value === option.id ? "text-white" : "text-gray-700"}`}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={["top"]}>
      <View className="px-6 pt-6 pb-4 flex-row items-center justify-between">
        <View>
          <Text className="text-xs text-muted font-medium">Management</Text>
          <Text className="text-xl font-bold text-gray-800">Patients</Text>
        </View>
        <TouchableOpacity
          onPress={openCreate}
          className="flex-row items-center bg-primary-600 rounded-xl px-4 py-2.5"
        >
          <Ionicons name="add" size={18} color="#fff" />
          <Text className="text-white text-sm font-semibold ml-1">Register</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={patients}
        keyExtractor={(item) => String(item.patient_id)}
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#277859" />}
        ListEmptyComponent={
          <View className="items-center pt-20">
            <Ionicons name="person-outline" size={40} color="#d1d5db" />
            <Text className="text-muted text-sm mt-3">No patients registered yet</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View className="mb-3">
            <PatientRow patient={item} onPress={() => openEdit(item)} />
            <View className="flex-row justify-end gap-2 -mt-1">
              {item.status === "active" ? (
                <TouchableOpacity
                  onPress={() => confirmDischarge(item)}
                  className="flex-row items-center rounded-xl border border-border px-3 py-2 bg-white"
                >
                  <Ionicons name="exit-outline" size={16} color="#b98942" />
                  <Text className="text-xs font-semibold text-amber-700 ml-1">Discharge</Text>
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity
                onPress={() => openReassign(item)}
                className="flex-row items-center rounded-xl border border-border px-3 py-2 bg-white"
              >
                <Ionicons name="swap-horizontal-outline" size={16} color="#277859" />
                <Text className="text-xs font-semibold text-primary-700 ml-1">Change Nurse</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => confirmDelete(item)}
                className="flex-row items-center rounded-xl bg-red-50 px-3 py-2"
              >
                <Ionicons name="trash-outline" size={16} color="#e05252" />
                <Text className="text-xs font-semibold text-red-600 ml-1">Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />

      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView className="flex-1 bg-surface">
          <View className="px-6 pt-6 pb-4 flex-row items-center justify-between border-b border-border">
            <Text className="text-lg font-bold text-gray-800">
              {editing
                ? modalMode === "reassign"
                  ? "Change Assigned Nurse"
                  : "Edit Patient"
                : "Register Patient"}
            </Text>
            <TouchableOpacity onPress={closeModal}>
              <Ionicons name="close" size={24} color="#6b7a72" />
            </TouchableOpacity>
          </View>
          <ScrollView className="px-6 pt-5" showsVerticalScrollIndicator={false}>
            <View className="gap-4 pb-10">
              {modalMode === "reassign" && editing ? (
                <View className="bg-white rounded-2xl border border-border p-4">
                  <Text className="text-sm font-semibold text-gray-800">
                    {editing.fname} {editing.lname}
                  </Text>
                  <Text className="text-xs text-muted mt-1">
                    {editing.illness_name ?? "No illness"} · {editing.room_name ?? "No room"}
                  </Text>
                  <Text className="text-xs text-muted mt-2">
                    Reassigning this patient will also move their medication schedules and unread alerts to the new nurse.
                  </Text>
                </View>
              ) : (
                <>
                  {[
                    { key: "fname", label: "First Name", placeholder: "Juan" },
                    { key: "lname", label: "Last Name", placeholder: "Dela Cruz" },
                    { key: "age", label: "Age", placeholder: "Age", keyboard: "numeric" as const },
                    { key: "address", label: "Address", placeholder: "Tupi" },
                    { key: "contact", label: "Contact", placeholder: "+63 9XX XXX XXXX" },
                    { key: "username", label: "Username", placeholder: "juan.delacruz" },
                    {
                      key: "password",
                      label: editing ? "New Password (Optional)" : "Password",
                      placeholder: "••••••••",
                      secure: true,
                    },
                  ].map((field) => (
                    <View key={field.key}>
                      <Text className="text-xs font-medium text-muted mb-1.5">{field.label}</Text>
                      <TextInput
                        value={(form as any)[field.key]}
                        onChangeText={(value) => setForm((prev) => ({ ...prev, [field.key]: value }))}
                        placeholder={field.placeholder}
                        placeholderTextColor="#9ca3af"
                        secureTextEntry={field.secure}
                        keyboardType={field.keyboard}
                        autoCapitalize="none"
                        className="bg-white border border-border rounded-xl px-4 py-3.5 text-sm text-gray-800"
                      />
                    </View>
                  ))}

                  <View>
                    <Text className="text-xs font-medium text-muted mb-1.5">Sex</Text>
                    <View className="flex-row gap-3">
                      {["Male", "Female"].map((sex) => (
                        <TouchableOpacity
                          key={sex}
                          onPress={() => setForm((prev) => ({ ...prev, sex }))}
                          className={`flex-1 py-3 rounded-xl border items-center ${
                            form.sex === sex ? "bg-primary-600 border-primary-600" : "bg-white border-border"
                          }`}
                        >
                          <Text className={`text-sm font-semibold ${form.sex === sex ? "text-white" : "text-gray-700"}`}>
                            {sex}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  <View>
                    <Text className="text-xs font-medium text-muted mb-1.5">Status</Text>
                    <View className="flex-row gap-3">
                      {["active", "discharged"].map((status) => (
                        <TouchableOpacity
                          key={status}
                          onPress={() => setForm((prev) => ({ ...prev, status }))}
                          className={`flex-1 py-3 rounded-xl border items-center ${
                            form.status === status ? "bg-primary-600 border-primary-600" : "bg-white border-border"
                          }`}
                        >
                          <Text className={`text-sm font-semibold capitalize ${form.status === status ? "text-white" : "text-gray-700"}`}>
                            {status}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                </>
              )}

              <SelectRow
                label={modalMode === "reassign" ? "New Nurse Assignment" : "Assign Nurse"}
                value={form.nurse_id}
                options={nurses.map((nurse) => ({ id: nurse.id, label: `${nurse.fname} ${nurse.lname} (${nurse.role || "Nurse"})` }))}
                onSelect={(id) => setForm((prev) => ({ ...prev, nurse_id: id }))}
              />
              {modalMode !== "reassign" ? (
                <>
                  <SelectRow
                    label="Illness"
                    value={form.illness_id}
                    options={[
                      ...illnesses.map((illness) => ({ id: illness.illness_id, label: illness.illness_name })),
                      { id: -1, label: "Other" },
                    ]}
                    onSelect={(id) => setForm((prev) => ({ ...prev, illness_id: id }))}
                  />
                  {form.illness_id === -1 && (
                    <View>
                      <Text className="text-xs font-medium text-muted mb-1.5">Specify Illness</Text>
                      <TextInput
                        value={form.customIllness}
                        onChangeText={(value) => setForm((prev) => ({ ...prev, customIllness: value }))}
                        placeholder="Enter illness name"
                        placeholderTextColor="#9ca3af"
                        className="bg-white border border-border rounded-xl px-4 py-3.5 text-sm text-gray-800"
                      />
                    </View>
                  )}
                  <SelectRow
                    label="Room"
                    value={form.room_id}
                    options={rooms.map((room) => ({ id: room.room_id, label: `${room.room_name} (${room.room_type})` }))}
                    onSelect={(id) => setForm((prev) => ({ ...prev, room_id: id }))}
                  />
                </>
              ) : null}

              <Button
                label={
                  editing
                    ? modalMode === "reassign"
                      ? "Update Nurse Assignment"
                      : "Save Changes"
                    : "Register Patient"
                }
                loading={saving}
                onPress={handleSave}
                fullWidth
              />
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
